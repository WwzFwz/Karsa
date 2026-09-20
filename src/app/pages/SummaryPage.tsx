/**
 * End of session.
 *
 * The share is computed from the event log, and split by input path, because
 * the claim this product makes is that a person who spoke their way through the
 * meeting contributed as much as the person who typed. That claim is either
 * visible here as a number or it is just a slogan.
 */

import { useMemo } from 'react'
import { useDocument } from '../../state/room/DocumentProvider'
import { summarise, timelineBuckets } from '../../services/summary/contributions'
import { EventLog } from '../../components/summary/EventLog'
import { INPUT_PATH_LABEL } from '../../core/vocabulary'
import { Icon } from '../../components/shared/icons'
import type { InputPath } from '../../core/model/types'
import { tr } from '../../core/i18n'

function minutes(from: number, to: number): number {
  return Math.max(1, Math.round((to - from) / 60000))
}

export function SummaryPage() {
  const { doc } = useDocument()
  const summary = useMemo(() => summarise(doc), [doc])
  const buckets = useMemo(() => timelineBuckets(doc.events), [doc.events])
  const peak = Math.max(1, ...buckets)
  const paths: InputPath[] = ['keyboard', 'voice', 'pointer', 'system']

  return (
    <div className="page page-summary">
      <section className="summary-main">
        {/*
          No page header. The navigation already says where you are, and the
          sentence that used to sit here just repeated the tiles underneath it.
        */}
        <div className="stat-row">
          <div className="stat">
            <p className="stat-label">
              <Icon name="activity" size={13} />{tr('Total perubahan', 'Total changes')}</p>
            <p className="stat-value">{summary.total}</p>
            <p className="stat-sub">
              {tr(
                `dalam ${minutes(summary.startedAt, summary.endedAt)} menit, oleh ${summary.rows.length} orang`,
                `in ${minutes(summary.startedAt, summary.endedAt)} minutes, by ${summary.rows.length} people`,
              )}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="mic" size={13} />{tr('Lewat suara', 'By voice')}</p>
            <p className="stat-value">{summary.byPath.voice}</p>
            <p className="stat-sub">
              {tr(
                `${Math.round((summary.byPath.voice / Math.max(summary.total, 1)) * 100)} persen dari seluruh perubahan`,
                `${Math.round((summary.byPath.voice / Math.max(summary.total, 1)) * 100)} per cent of every change`,
              )}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="help" size={13} />{tr('Pertanyaan terbuka', 'Open questions')}</p>
            <p className="stat-value">{summary.openQuestions.length}</p>
            <p className="stat-sub">
              {tr(
                `${summary.unresolvedComments} komentar belum selesai`,
                `${summary.unresolvedComments} unresolved comments`,
              )}
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="checkSquare" size={13} />{tr('Tindakan tersisa', 'Actions left')}</p>
            <p className="stat-value">{summary.openActions.length}</p>
            <p className="stat-sub">{tr('belum ditandai selesai', 'not marked done yet')}</p>
          </div>
        </div>

        <section className="panel" aria-labelledby="share-heading">
          <header className="panel-head">
            <h2 id="share-heading">
              <Icon name="users" size={15} />{tr('Porsi kontribusi', 'Share of contributions')}</h2>
          </header>
          <table className="share-table">
            <caption className="sr-only">
              {tr(
                'Porsi kontribusi tiap peserta, dihitung dari jejak peristiwa, dipecah menurut jalur masukan.',
                'Each person’s share of the contributions, counted from the event trail and split by input path.',
              )}
            </caption>
            <thead>
              <tr>
                <th scope="col">{tr('Peserta', 'People')}</th>
                <th scope="col">{tr('Perubahan', 'Changes')}</th>
                <th scope="col">{tr('Porsi', 'Share')}</th>
                <th scope="col">{tr('Papan ketik', 'Keyboard')}</th>
                <th scope="col">{tr('Suara', 'Voice')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.actorId}>
                  <th scope="row">
                    <span className="share-name">
                      <span
                        className="avatar small"
                        aria-hidden="true"
                        style={{ ['--hue' as string]: String(row.hue) }}
                      >
                        {row.displayName.charAt(0)}
                      </span>
                      {row.displayName}
                    </span>
                  </th>
                  <td>{row.total}</td>
                  <td>
                    <span className="bar" aria-hidden="true">
                      <span
                        className="bar-fill"
                        style={{ width: `${row.share * 100}%`, ['--hue' as string]: String(row.hue) }}
                      />
                    </span>
                    {tr(`${Math.round(row.share * 100)} persen`, `${Math.round(row.share * 100)} per cent`)}
                  </td>
                  <td>{row.byPath.keyboard}</td>
                  <td>{row.byPath.voice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="path-heading">
          <header className="panel-head">
            <h2 id="path-heading">
              <Icon name="keyboard" size={15} />{tr('Jalur masukan', 'Input path')}</h2>
          </header>
          <ul className="path-list">
            {paths
              .filter((p) => summary.byPath[p] > 0)
              .map((p) => (
                <li key={p}>
                  <span className={`path-tag path-${p}`}>
                    <Icon name={p === 'voice' ? 'mic' : 'keyboard'} size={11} />
                    {INPUT_PATH_LABEL[p]}
                  </span>
                  <span>{tr(`${summary.byPath[p]} perubahan`, `${summary.byPath[p]} changes`)}</span>
                </li>
              ))}
          </ul>
          <p className="panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
            {tr(
              'Angka ini yang membedakan produk ini dari papan kerja biasa: kontribusi lewat suara tercatat setara dengan kontribusi lewat papan ketik.',
              'This number is what sets this product apart from an ordinary board: a contribution made by voice counts exactly as much as one made by keyboard.',
            )}
          </p>
        </section>

        <section className="panel" aria-labelledby="tempo-heading">
          <header className="panel-head">
            <h2 id="tempo-heading">
              <Icon name="activity" size={15} />{tr('Tempo sesi', 'Session pace')}</h2>
          </header>
          <div
            className="spark"
            role="img"
            aria-label={tr(
              `Tempo perubahan sepanjang sesi: ${buckets.join(', ')}`,
              `The pace of change across the session: ${buckets.join(', ')}`,
            )}
          >
            {buckets.map((value, i) => (
              <span key={i} className="spark-bar" style={{ height: `${(value / peak) * 100}%` }} />
            ))}
          </div>
        </section>
      </section>

      <aside className="side-column" aria-label={tr('Sisa pekerjaan', 'Work left')}>
        <section className="panel" aria-labelledby="loose-heading">
          <header className="panel-head">
            <h2 id="loose-heading">
              <Icon name="alert" size={15} />{tr('Belum selesai', 'Not finished')}</h2>
          </header>
          <h3 className="panel-sub">{tr('Pertanyaan terbuka', 'Open questions')}</h3>
          <ul className="loose-list">
            {summary.openQuestions.map((q) => (
              <li key={q.id}>
                <Icon name="help" size={14} />
                {q.title}
              </li>
            ))}
            {summary.openQuestions.length === 0 && <li className="empty">{tr('Tidak ada.', 'None.')}</li>}
          </ul>
          <h3 className="panel-sub">{tr('Tindakan belum tuntas', 'Unfinished actions')}</h3>
          <ul className="loose-list">
            {summary.openActions.map((a) => (
              <li key={a.id}>
                <Icon name="checkSquare" size={14} />
                {a.title}
              </li>
            ))}
            {summary.openActions.length === 0 && <li className="empty">{tr('Tidak ada.', 'None.')}</li>}
          </ul>
        </section>
        <EventLog limit={12} />
      </aside>
    </div>
  )
}
