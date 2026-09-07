/**
 * End of session.
 *
 * The share is computed from the event log, and split by input path, because
 * the claim this product makes is that a person who spoke their way through the
 * meeting contributed as much as the person who typed. That claim is either
 * visible here as a number or it is just a slogan.
 */

import { useMemo } from 'react'
import { useRoom } from '../app/RoomContext'
import { summarise, timelineBuckets } from '../features/summary/contributions'
import { EventLog } from '../features/summary/EventLog'
import { INPUT_PATH_LABEL } from '../ui/labels'
import { Icon } from '../ui/icons'
import type { InputPath } from '../core/model/types'

function minutes(from: number, to: number): number {
  return Math.max(1, Math.round((to - from) / 60000))
}

export function SummaryPage() {
  const { doc } = useRoom()
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
              <Icon name="activity" size={13} />
              Total perubahan
            </p>
            <p className="stat-value">{summary.total}</p>
            <p className="stat-sub">
              dalam {minutes(summary.startedAt, summary.endedAt)} menit, oleh {summary.rows.length}{' '}
              orang
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="mic" size={13} />
              Lewat suara
            </p>
            <p className="stat-value">{summary.byPath.voice}</p>
            <p className="stat-sub">
              {Math.round((summary.byPath.voice / Math.max(summary.total, 1)) * 100)} persen dari
              seluruh perubahan
            </p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="help" size={13} />
              Pertanyaan terbuka
            </p>
            <p className="stat-value">{summary.openQuestions.length}</p>
            <p className="stat-sub">{summary.unresolvedComments} komentar belum selesai</p>
          </div>
          <div className="stat">
            <p className="stat-label">
              <Icon name="checkSquare" size={13} />
              Tindakan tersisa
            </p>
            <p className="stat-value">{summary.openActions.length}</p>
            <p className="stat-sub">belum ditandai selesai</p>
          </div>
        </div>

        <section className="panel" aria-labelledby="share-heading">
          <header className="panel-head">
            <h2 id="share-heading">
              <Icon name="users" size={15} />
              Porsi kontribusi
            </h2>
          </header>
          <table className="share-table">
            <caption className="sr-only">
              Porsi kontribusi tiap peserta, dihitung dari jejak peristiwa, dipecah menurut jalur
              masukan.
            </caption>
            <thead>
              <tr>
                <th scope="col">Peserta</th>
                <th scope="col">Perubahan</th>
                <th scope="col">Porsi</th>
                <th scope="col">Papan ketik</th>
                <th scope="col">Suara</th>
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
                    {Math.round(row.share * 100)} persen
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
              <Icon name="keyboard" size={15} />
              Jalur masukan
            </h2>
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
                  <span>{summary.byPath[p]} perubahan</span>
                </li>
              ))}
          </ul>
          <p className="panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
            Angka ini yang membedakan produk ini dari papan kerja biasa: kontribusi lewat suara
            tercatat setara dengan kontribusi lewat papan ketik.
          </p>
        </section>

        <section className="panel" aria-labelledby="tempo-heading">
          <header className="panel-head">
            <h2 id="tempo-heading">
              <Icon name="activity" size={15} />
              Tempo sesi
            </h2>
          </header>
          <div
            className="spark"
            role="img"
            aria-label={`Tempo perubahan sepanjang sesi: ${buckets.join(', ')}`}
          >
            {buckets.map((value, i) => (
              <span key={i} className="spark-bar" style={{ height: `${(value / peak) * 100}%` }} />
            ))}
          </div>
        </section>
      </section>

      <aside className="side-column" aria-label="Sisa pekerjaan">
        <section className="panel" aria-labelledby="loose-heading">
          <header className="panel-head">
            <h2 id="loose-heading">
              <Icon name="alert" size={15} />
              Belum selesai
            </h2>
          </header>
          <h3 className="panel-sub">Pertanyaan terbuka</h3>
          <ul className="loose-list">
            {summary.openQuestions.map((q) => (
              <li key={q.id}>
                <Icon name="help" size={14} />
                {q.title}
              </li>
            ))}
            {summary.openQuestions.length === 0 && <li className="empty">Tidak ada.</li>}
          </ul>
          <h3 className="panel-sub">Tindakan belum tuntas</h3>
          <ul className="loose-list">
            {summary.openActions.map((a) => (
              <li key={a.id}>
                <Icon name="checkSquare" size={14} />
                {a.title}
              </li>
            ))}
            {summary.openActions.length === 0 && <li className="empty">Tidak ada.</li>}
          </ul>
        </section>
        <EventLog limit={12} />
      </aside>
    </div>
  )
}
