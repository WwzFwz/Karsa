/**
 * The narration log, shown as text.
 *
 * Same sentences the announcer speaks and the earcons stand in for. Putting it
 * on screen is how rule 5 stays honest: if an operation ever produced a line
 * nobody could read here, the operation would be the problem.
 */

import { useRoom } from '../../app/RoomContext'
import { narrate } from '../../core/events/narrate'
import { INPUT_PATH_LABEL } from '../../core/vocabulary'
import { Icon } from '../../ui/icons'

function clock(at: number): string {
  return new Date(at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function EventLog({ limit = 14 }: { limit?: number }) {
  const { doc, nameOf } = useRoom()
  const events = [...doc.events].slice(-limit).reverse()

  return (
    <section className="panel" aria-labelledby="log-heading">
      <header className="panel-head">
        <h2 id="log-heading">
          <Icon name="clock" size={15} />
          Jejak perubahan
        </h2>
        <span className="pill">{doc.events.length} peristiwa</span>
      </header>
      <ol className="log">
        {events.map((event) => (
          <li key={event.id} className="log-row">
            <span className="log-time">{clock(event.at)}</span>
            <span className="log-text">{narrate(event, nameOf(event.actorId))}</span>
            <span className={`path-tag path-${event.inputPath}`}>
              <Icon name={event.inputPath === 'voice' ? 'mic' : 'keyboard'} size={11} />
              {INPUT_PATH_LABEL[event.inputPath]}
            </span>
          </li>
        ))}
      </ol>
      <p className="panel-note" style={{ marginTop: 10, marginBottom: 0 }}>
        Satu peristiwa, satu kalimat. Kalimat ini juga yang dibacakan pembaca layar dan diwakili
        bunyi pendek.
      </p>
    </section>
  )
}
