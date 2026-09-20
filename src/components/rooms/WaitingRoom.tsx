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

import { useCallback, useEffect, useRef } from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import { Icon } from '../shared/icons'
import { agoLabel, type RoomAccess } from '../../services/rooms/rooms'
import { useJoinRequests } from '../../state/rooms/useJoinRequests'
import { bilingual, tr } from '../../core/i18n'

const STATUS_WORD: Record<'diterima' | 'ditolak', string> = bilingual(
  { diterima: 'Diterima', ditolak: 'Ditolak' },
  { diterima: 'Accepted', ditolak: 'Declined' },
)

export function WaitingRoom({ access }: { access: RoomAccess }) {
  const { waiting, answered, answer } = useJoinRequests()
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
    async (id: string, status: 'diterima' | 'ditolak') => {
      const done = await answer(id, status)
      if (!done) return
      announce(
        status === 'diterima'
          ? tr(`${done.name} diterima masuk ruang.`, `${done.name} was let into the room.`)
          : tr(`${done.name} ditolak masuk ruang.`, `${done.name} was refused entry.`),
      )
      audioBus.emit({
        earcon: status === 'diterima' ? 'joinAccepted' : 'joinDeclined',
        depth: 0,
        hue: done.hue,
      })
    },
    [announce, answer],
  )

  const respondAll = async (status: 'diterima' | 'ditolak') => {
    const done = (await Promise.all(waiting.map((request) => answer(request.id, status)))).filter(
      (request): request is NonNullable<typeof request> => request !== null,
    )
    if (done.length === 0) return
    announce(
      status === 'diterima'
        ? tr(`${done.length} orang diterima masuk ruang.`, `${done.length} people were let into the room.`)
        : tr(`${done.length} permintaan masuk ditolak.`, `${done.length} requests were refused.`),
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
        {tr(
          'Ruang ini terbuka: siapa pun yang punya kodenya langsung masuk, tanpa ruang tunggu.',
          'This room is open: anyone with the code walks straight in, with no waiting room.',
        )}
      </p>
    )
  }

  if (waiting.length === 0 && answered.length === 0) {
    return (
      <p className="panel-note">
        <Icon name="lock" size={14} />
        {tr(
          'Ruang ini terkunci. Orang yang memakai kodenya menunggu di sini sampai kamu terima.',
          'This room is locked. Whoever uses the code waits here until you let them in.',
        )}
      </p>
    )
  }

  return (
    <section className="waiting" aria-labelledby="waiting-heading">
      <header className="panel-head">
        <h3 id="waiting-heading" className="panel-sub">
          <Icon name="lock" size={14} />{tr('Menunggu diterima', 'Waiting to be let in')}</h3>
        {waiting.length > 0 && <span className="pill pill-warn">{waiting.length} orang</span>}
      </header>

      {waiting.length === 0 ? (
        <p className="panel-note">{tr('Tidak ada yang sedang menunggu.', 'Nobody is waiting.')}</p>
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
                  </p>
                </div>
                <div className="person-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={() => void respond(request.id, 'diterima')}
                  >{tr('Terima', 'Accept')}</button>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => void respond(request.id, 'ditolak')}
                  >{tr('Tolak', 'Decline')}</button>
                </div>
              </li>
            ))}
          </ul>

          {waiting.length > 1 && (
            <div className="panel-actions">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => void respondAll('diterima')}
              >
                <Icon name="check" size={15} />{tr('Terima semua', 'Accept all')}</button>
              <button type="button" className="btn btn-small" onClick={() => void respondAll('ditolak')}>
                <Icon name="x" size={15} />{tr('Tolak semua', 'Decline all')}</button>
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
