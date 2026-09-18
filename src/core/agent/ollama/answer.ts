/**
 * The model's answer, turned into commands the document will accept.
 *
 * This is where D49 is enforced one level down: the model names nodes by title
 * and never by id, and the code resolves them. A title that matches nothing
 * does not become an invented node -- the step is dropped or the sentence comes
 * back as plain text. The model has opinions; this file holds the rules.
 *
 * Grounding is the other half. Every existing node a direct change points at
 * must share a real word with what was said, because the probe caught the model
 * proposing to delete a node nobody had mentioned.
 */

import { expandTemplate, templateSize } from '../../templates/expand'
import { templateById } from '../../templates/registry'
import type { Plan, PlanStep } from '../types'
import type { PlanInput } from '../provider'
import { findNodeByTitle, normalise, tidyTitle } from '../structure'
import type { Command } from '../../commands/types'
import type { NodeId } from '../../model/types'
import { KIND_LABEL, RELATION_LABEL } from '../../vocabulary'
import { tr } from '../../i18n'
import { KIND_BY_WORD, RELATION_BY_WORD, type ModelOp } from './schema'

export function saidIn(said: string, title: string): boolean {
  const words = new Set(normalise(said).split(' '))
  return normalise(title)
    .split(' ')
    .some((word) => word.length >= 4 && words.has(word))
}

/**
 * Model operations into plan steps. `groundIn` set means direct changes: every
 * existing node must have been said. Unset means options the person will pick
 * explicitly.
 */
export function buildSteps(ops: ModelOp[], input: PlanInput, groundIn: string | null): PlanStep[] {
  const { doc } = input
  const title = (id: NodeId | null) => (id ? doc.nodes[id]?.title ?? tr('simpul', 'node') : tr('ruang', 'the room'))
  const resolve = (spoken: string) => {
    const hit = spoken ? findNodeByTitle(doc, spoken) : null
    if (!hit) return null
    if (groundIn !== null && !saidIn(groundIn, doc.nodes[hit.id]?.title ?? '')) return null
    return hit
  }
  const sure = (hit: { score: number } | null) => (hit && hit.score >= 0.75 ? 0.85 : 0.55)
  const steps: PlanStep[] = []

  for (const op of ops ?? []) {
    const target = resolve(op.sasaran)
    const parent = resolve(op.induk)

    if (op.jenis === 'tambah' && op.judul.trim()) {
      const kind = KIND_BY_WORD[op.tipe ?? ''] ?? 'idea'
      // A parent that was named but not found is not silently swapped for the
      // focus on a direct change; it is dropped so the caller can ask.
      if (op.induk && !parent && groundIn !== null) continue
      const parentId = parent?.id ?? input.focusId
      const tidy = tidyTitle(op.judul)
      const command: Command = {
        type: 'createNode',
        parentId,
        kind,
        title: tidy.title,
        ...(tidy.note ? { note: tidy.note } : {}),
      }
      steps.push({
        agent: tidy.note ? 'perapi' : 'penyusun',
        preview: tr(
          `Tambah ${KIND_LABEL[kind]} "${tidy.title}" di bawah ${title(parentId)}.`,
          `Add ${KIND_LABEL[kind]} "${tidy.title}" under ${title(parentId)}.`,
        ),
        confidence: op.induk ? sure(parent) : 0.8,
        commands: [command],
      })
    } else if (op.jenis === 'ubah_judul' && target && op.judul.trim()) {
      const tidy = tidyTitle(op.judul)
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Ganti judul "${title(target.id)}" menjadi "${tidy.title}".`,
          `Rename "${title(target.id)}" to "${tidy.title}".`,
        ),
        confidence: sure(target),
        commands: [{ type: 'renameNode', id: target.id, title: tidy.title }],
      })
    } else if (op.jenis === 'pindah' && target && parent && target.id !== parent.id) {
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Pindahkan "${title(target.id)}" ke bawah "${title(parent.id)}".`,
          `Move "${title(target.id)}" under "${title(parent.id)}".`,
        ),
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'moveNode', id: target.id, parentId: parent.id }],
      })
    } else if (op.jenis === 'hapus' && target) {
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Hapus "${title(target.id)}". Anak-anaknya naik satu tingkat.`,
          `Delete "${title(target.id)}". Its children move up one level.`,
        ),
        confidence: Math.min(sure(target), 0.8),
        commands: [{ type: 'deleteNode', id: target.id, mode: 'promote' }],
      })
    } else if (op.jenis === 'hubung' && target && parent && target.id !== parent.id) {
      const kind = RELATION_BY_WORD[op.relasi ?? ''] ?? 'refers_to'
      steps.push({
        agent: 'penyusun',
        preview: tr(
          `Hubungkan "${title(target.id)}" ${RELATION_LABEL[kind]} "${title(parent.id)}".`,
          `Link "${title(target.id)}", ${RELATION_LABEL[kind]} "${title(parent.id)}".`,
        ),
        confidence: Math.min(sure(target), sure(parent)),
        commands: [{ type: 'addRelation', fromId: target.id, toId: parent.id, kind }],
      })
    }
  }
  return steps
}

export function templateStep(templateId: string, retitle: string, named: boolean, input: PlanInput): PlanStep | null {
  const spec = templateById(templateId)
  if (!spec) return null
  const built = spec.build()
  // The model may retitle the container. It may not restructure it: the shape
  // of a retro board is not a thing worth letting a 7B model improvise.
  const root = retitle.trim() ? { ...built, title: retitle.trim().slice(0, 60) } : built
  return {
    agent: 'pemilih',
    preview: tr(
      `Siapkan ${spec.label.toLowerCase()}: ${templateSize(root)} simpul.`,
      `Set up ${spec.label.toLowerCase()}: ${templateSize(root)} nodes.`,
    ),
    confidence: named ? 0.92 : 0.6,
    commands: expandTemplate(root, input.focusId),
    source: { kind: spec.id === 'voting' ? 'alat' : 'templat', id: spec.id, label: spec.label },
  }
}

/** The node a question option is about, so the agent cursor can stand on it. */
export function targetOf(commands: Command[]): NodeId | undefined {
  for (const c of commands) {
    if ('id' in c && typeof c.id === 'string' && c.type !== 'createNode') return c.id
    if (c.type === 'createNode' && c.parentId) return c.parentId
    if (c.type === 'addRelation') return c.fromId
  }
  return undefined
}

export function twoToolsQuestion(named: string[], input: PlanInput): Plan {
  const choices = named
    .map((id) => templateById(id))
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec))
    .map((spec) => ({ id: spec.id, label: spec.label, commands: expandTemplate(spec.build(), input.focusId) }))
  return {
    intent: 'ambigu',
    reason: tr('Dua alat disebut dalam satu kalimat, jadi ini tidak ditebak.', 'Two tools were named in one sentence, so this is not guessed.'),
    steps: [],
    question: {
      question: tr(
        `Yang mana dulu: ${choices.map((c) => c.label).join(' atau ')}?`,
        `Which one first: ${choices.map((c) => c.label).join(' or ')}?`,
      ),
      choices,
    },
  }
}

