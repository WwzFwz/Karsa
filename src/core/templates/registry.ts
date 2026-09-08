/**
 * Templates: a shape of meeting, dropped in one gesture.
 *
 * A template is not a new kind of thing either. It is a batch of `createNode`
 * commands with the right kinds already chosen, which is exactly what someone
 * would have typed -- just without the typing. That is the whole trick, and it
 * is why templates cost almost nothing: the model already knew how to hold a
 * retro board, nobody had ever handed it one.
 *
 * The list is chosen from what teams actually run, not from what is easy to
 * draw: sprint planning, retro, prioritisation, root cause, parking lot. Each
 * one has to pass the two questions in section 5 -- does it help turn talk into
 * a shared visual, and do the three views stay equal afterwards. A template
 * made of typed nodes passes both by construction.
 *
 * Section 12 is the fence. The moment a template wants an assignee, a due date
 * or tracking across rooms, it has stopped being a meeting and started being a
 * task manager, and it does not belong here.
 */

import type { NodeKind, ToolKind } from '../model/types'
import type { IconName } from '../../ui/icons'

export interface TemplateNode {
  kind: NodeKind
  title: string
  note?: string
  tool?: ToolKind
  children?: TemplateNode[]
}

export interface TemplateSpec {
  id: string
  label: string
  icon: IconName
  /** One line, shown under the name in the palette. */
  hint: string
  /** What the whole thing is called once it lands. */
  build: () => TemplateNode
}

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 'voting',
    label: 'Voting',
    icon: 'checkSquare',
    hint: 'Satu keputusan, beberapa pilihan, suaranya terhitung.',
    build: () => ({
      kind: 'decision',
      title: 'Yang perlu diputuskan',
      tool: 'suara',
      children: [
        { kind: 'idea', title: 'Pilihan pertama' },
        { kind: 'idea', title: 'Pilihan kedua' },
        { kind: 'idea', title: 'Pilihan ketiga' },
      ],
    }),
  },
  {
    id: 'retro',
    label: 'Retro',
    icon: 'activity',
    hint: 'Mulai, hentikan, lanjutkan. Tiga kelompok, tanpa alat khusus.',
    build: () => ({
      kind: 'group',
      title: 'Retro sprint',
      tool: 'retro',
      children: [
        { kind: 'group', title: 'Mulai lakukan' },
        { kind: 'group', title: 'Hentikan' },
        { kind: 'group', title: 'Lanjutkan' },
      ],
    }),
  },
  {
    id: 'matriks',
    label: 'Matriks dampak–usaha',
    icon: 'layout',
    hint: 'Empat kuadran sebagai kelompok. Memindahkan item = mengganti induknya.',
    build: () => ({
      kind: 'group',
      title: 'Prioritas: dampak dan usaha',
      tool: 'matriks',
      note: 'Kuadran adalah kelompok, bukan koordinat. Karena itu outline bisa menyebutkan letak sebuah item dengan kata-kata, dan memindahkannya cuma mengganti induk.',
      children: [
        { kind: 'group', title: 'Dampak besar · usaha kecil' },
        { kind: 'group', title: 'Dampak besar · usaha besar' },
        { kind: 'group', title: 'Dampak kecil · usaha kecil' },
        { kind: 'group', title: 'Dampak kecil · usaha besar' },
      ],
    }),
  },
  {
    id: 'sprint',
    label: 'Rencana sprint',
    icon: 'list',
    hint: 'Tujuan, lingkup, risiko, dan yang sengaja tidak dikerjakan.',
    build: () => ({
      kind: 'group',
      title: 'Rencana sprint',
      children: [
        { kind: 'decision', title: 'Tujuan sprint' },
        { kind: 'group', title: 'Masuk lingkup' },
        { kind: 'group', title: 'Sengaja tidak dikerjakan' },
        { kind: 'question', title: 'Risiko dan ketergantungan' },
      ],
    }),
  },
  {
    id: 'lima_kenapa',
    label: 'Lima kenapa',
    icon: 'help',
    hint: 'Menelusuri sebab, satu pertanyaan menurun ke pertanyaan berikutnya.',
    build: () => ({
      kind: 'question',
      title: 'Masalah yang diusut',
      children: [
        {
          kind: 'question',
          title: 'Kenapa itu terjadi?',
          children: [
            {
              kind: 'question',
              title: 'Kenapa itu terjadi?',
              children: [
                {
                  kind: 'question',
                  title: 'Kenapa itu terjadi?',
                  children: [
                    { kind: 'question', title: 'Kenapa itu terjadi?' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'parkir',
    label: 'Tempat parkir',
    icon: 'help',
    hint: 'Pertanyaan yang belum waktunya dijawab, supaya rapat bisa jalan terus.',
    build: () => ({
      kind: 'group',
      title: 'Hal yang belum jelas',
      children: [{ kind: 'question', title: 'Pertanyaan pertama' }],
    }),
  },
]

export function templateById(id: string): TemplateSpec | null {
  return TEMPLATES.find((template) => template.id === id) ?? null
}
