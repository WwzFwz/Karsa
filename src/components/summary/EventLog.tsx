/**
 * The narration log, shown as text.
 *
 * Same sentences the announcer speaks and the earcons stand in for. Putting it
 * on screen is how rule 5 stays honest: if an operation ever produced a line
 * nobody could read here, the operation would be the problem.
 */

import { useDocument } from '../../state/room/DocumentProvider'
import { narrate } from '../../core/events/narrate'
import { INPUT_PATH_LABEL } from '../../core/vocabulary'
import { Icon } from '../shared/icons'
import { lang, tr } from '../../core/i18n'

function clock(at: number): string {
  // The clock follows the output language, so 22.19 and 10:19 PM are not both
  // on screen at once depending on which sentence you happen to read.
  return new Date(at).toLocaleTimeString(lang() === 'en' ? 'en-GB' : 'id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventLog({ limit = 14 }: { limit?: number }) {
  const { doc, nameOf } = useDocument()
  const events = [...doc.events].slice(-limit).reverse()

  return (
    <section className="panel" aria-labelledby="log-heading">
      <header className="panel-head">
        <h2 id="log-heading">
          <Icon name="clock" size={15} />{tr('Jejak perubahan', 'Change log')}</h2>
        <span className="pill">
          {tr(`${doc.events.length} peristiwa`, `${doc.events.length} events`)}
        </span>
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
        {tr(
          'Satu peristiwa, satu kalimat. Kalimat ini juga yang dibacakan pembaca layar dan diwakili bunyi pendek.',
          'One event, one sentence. It is the same sentence a screen reader reads out and a short sound stands in for.',
        )}
      </p>
    </section>
  )
}
