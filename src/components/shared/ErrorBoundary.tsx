/**
 * The last thing between a thrown error and a white screen.
 *
 * React unmounts the whole tree when a render throws and nothing catches it,
 * which leaves a blank page with no way back -- and a blank page is the one
 * failure this product cannot explain, because there is nothing left on screen
 * to read, to focus, or to announce. Rule 7 says accessibility is not a mode
 * you switch on; the same has to be true of the failure path.
 *
 * A class, because `componentDidCatch` has no hook equivalent. It is the only
 * class component here and it stays the only one.
 *
 * Deliberately narrow: this catches errors thrown while *rendering*. An error
 * inside an event handler or a promise never reaches it, and pretending
 * otherwise would be the kind of safety net that is only there in the demo.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Icon } from './icons'
import { tr } from '../../core/i18n'

interface Props {
  children: ReactNode
  /**
   * What is being guarded, named for the person reading the message: the whole
   * app, or just the part of the screen that broke.
   */
  scope: 'app' | 'view'
  /**
   * Changing this clears the error.
   *
   * Without it, one broken screen stays broken for the rest of the session:
   * the boundary keeps rendering its message while the person navigates away,
   * because React never re-mounts it. The room passes its route here, so
   * leaving a crashed view is enough to recover.
   */
  resetKey?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(previous: Props): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
      The console is the only place this can go.

      There is no error reporting service to send it to, and there must not be:
      a component stack names the room's own structure, and section 8 promises
      that what is in a room does not leave the device. So it is printed, and
      the message on screen carries enough of it to repeat in a bug report.
    */
    console.error('Karsa: render gagal', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const whole = this.props.scope === 'app'
    return (
      <div className={whole ? 'join' : 'crash-inline'} role="alert">
        <main className="join-card crash">
          <h1>{tr('Ada yang rusak di layar ini.', 'Something on this screen broke.')}</h1>
          <p className="join-lede">
            {whole
              ? tr(
                  'Isi ruang tidak ikut rusak: yang gagal cuma cara menggambarnya, dan isinya tersimpan di perangkat ini serta di server.',
                  'Nothing in the room broke with it: only the drawing of it failed, and what is in the room is kept on this device and on the server.',
                )
              : tr(
                  'Bagian lain masih jalan. Pindah ke tampilan lain, atau coba gambar ulang bagian ini.',
                  'The rest still works. Move to another view, or try drawing this part again.',
                )}
          </p>

          <div className="join-actions is-single">
            <button type="button" className="btn btn-primary btn-wide" onClick={this.reset}>
              <Icon name="undo" size={17} />
              {tr('Coba gambar ulang', 'Try drawing it again')}
            </button>
          </div>

          {whole && (
            <div className="join-actions is-single">
              <button type="button" className="btn btn-wide" onClick={() => window.location.reload()}>
                {tr('Muat ulang halaman', 'Reload the page')}
              </button>
            </div>
          )}

          {/*
            Folded, not hidden. Nobody needs to read a stack trace to carry on,
            but the person who files the bug should not have to be talked
            through opening a developer console to find it.
          */}
          <details className="field-more crash-detail">
            <summary>{tr('Rincian teknis', 'Technical detail')}</summary>
            <code>{error.message}</code>
          </details>
        </main>
      </div>
    )
  }
}
