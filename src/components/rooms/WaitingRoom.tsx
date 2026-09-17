/**
 * The people at the door.
 *
 * Zoom's placement, not Drive's. Drive answers an access request in an inbox
 * hours later, which is useless while the meeting is happening; Zoom answers it
 * in the participants panel in the same second. So the waiting list sits at the
 * top of the same panel as the people already here, which is also where anyone
 * looking for "who is in this room" is already looking.
 *
 * Every answer is announced and gets an earcon, because a participant list is
 * exactly the thing persona B cannot glance at. "Dewi Anggraini diterima masuk"
 * is one sentence, which is rule 5, and the knock has its own sound so a person
 * who cannot see the badge still knows somebody is waiting.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import { Icon } from '../shared/icons'
import { agoLabel, type RoomAccess } from '../../services/rooms/rooms'
import { answer, answerAll, answeredFor, snapshot, subscribe, waitingFor } from '../../services/rooms/requests'

const STATUS_WORD = { diterima: 'Diterima', ditolak: 'Ditolak' } as const

export function useWaiting(roomId: string) {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return waitingFor(roomId)
}

export function WaitingRoom({ roomId, access }: { roomId: string; access: RoomAccess }) {
  const waiting = useWaiting(roomId)
  const answered = answeredFor(roomId)
  const { announce } = useAnnouncer()

  const knocks = useRef(0)
  useEffect(() => {
    // Only a *new* arrival is worth a sound. Re-rendering is not an event.
    if (waiting.length > knocks.current) {
      audioBus.emit({ earcon: 'joinRequest', depth: 0, hue: waiting[waiting.length - 1].hue })
    }
    knocks.current = waiting.length
  }, [waiting])

  const respond = useCallback(
    (id: string, status: 'diterima' | 'ditolak') => {
      const done = answer(id, status)
      if (!done) return
      announce(
        status === 'diterima'
          ? `${done.name} diterima masuk ruang.`
          : `${done.name} ditolak masuk ruang.`,
      )
      audioBus.emit({
        earcon: status === 'diterima' ? 'joinAccepted' : 'joinDeclined',
        depth: 0,
        hue: done.hue,
      })
    },
    [announce],
  )

  const respondAll = (status: 'diterima' | 'ditolak') => {
    const done = answerAll(roomId, status)
    if (done.length === 0) return
    announce(
      status === 'diterima'
        ? `${done.length} orang diterima masuk ruang.`
        : `${done.length} permintaan masuk ditolak.`,
    )
    audioBus.emit({
      earcon: status === 'diterima' ? 'joinAccepted' : 'joinDeclined',
      depth: 0,
      hue: done[0].hue,
    })
  }

  if (access === 'terbuka') {
    return (
      <p className="panel-note">
        <Icon name="link" size={14} />
        Ruang ini terbuka: siapa pun yang punya kodenya langsung masuk, tanpa ruang tunggu.
      </p>
    )
  }

  if (waiting.length === 0 && answered.length === 0) {
    return (
      <p className="panel-note">
        <Icon name="lock" size={14} />
        Ruang ini terkunci. Orang yang memakai kodenya menunggu di sini sampai kamu terima.
      </p>
    )
  }

  return (
    <section className="waiting" aria-labelledby="waiting-heading">
      <header className="panel-head">
        <h3 id="waiting-heading" className="panel-sub">
          <Icon name="lock" size={14} />
          Menunggu diterima
        </h3>
        {waiting.length > 0 && <span className="pill pill-warn">{waiting.length} orang</span>}
      </header>

      {waiting.length === 0 ? (
        <p className="panel-note">Tidak ada yang sedang menunggu.</p>
      ) : (
        <>
          <ul className="people">
            {waiting.map((request) => (
              <li
                key={request.id}
                className="person"
                style={{ ['--hue' as string]: String(request.hue) }}
              >
                <span className="avatar" aria-hidden="true">
                  {request.name.charAt(0)}
                </span>
                <div className="person-body">
                  <p className="person-name">{request.name}</p>
                  <p className="person-where">
                    <Icon name={request.via === 'tautan' ? 'link' : 'keyboard'} size={12} />
                    Lewat {request.via}, {agoLabel(request.askedAt)}
                    {request.email && <span className="tag">{request.email}</span>}
                  </p>
                </div>
                <div className="person-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={() => respond(request.id, 'diterima')}
                  >
                    Terima
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => respond(request.id, 'ditolak')}
                  >
                    Tolak
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {waiting.length > 1 && (
            <div className="panel-actions">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => respondAll('diterima')}
              >
                <Icon name="check" size={15} />
                Terima semua
              </button>
              <button type="button" className="btn btn-small" onClick={() => respondAll('ditolak')}>
                <Icon name="x" size={15} />
                Tolak semua
              </button>
            </div>
          )}
        </>
      )}

      {answered.length > 0 && (
        <ul className="people is-dim">
          {answered.map((request) => (
            <li
              key={request.id}
              className="person"
              style={{ ['--hue' as string]: String(request.hue) }}
            >
              <span className="avatar is-off" aria-hidden="true">
                {request.name.charAt(0)}
              </span>
              <div className="person-body">
                <p className="person-name">
                  {request.name}
                  <span className={`tag ${request.status === 'ditolak' ? 'tag-off' : ''}`}>
                    {STATUS_WORD[request.status as 'diterima' | 'ditolak']}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
