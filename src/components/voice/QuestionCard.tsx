/**
 * The assistant asking back.
 *
 * One component for every place a question can stand -- the agent cursor on the
 * canvas, the dock, the command panel -- so the three can never offer different
 * ways out. There are always three ways to answer, because the people answering
 * are not the same person:
 *
 *   - click or tab to a numbered option,
 *   - say the number or the words of an option ("yang kedua", "the first one"),
 *   - say or type something else entirely, which goes back to the model together
 *     with the question.
 *
 * Numbers are in the label because a spoken answer needs something to point at
 * that does not depend on seeing where the button is (rule 2's spirit).
 */

import { useState } from 'react'
import { useAssistant } from '../../state/room/AssistantProvider'
import { tr } from '../../core/i18n'
import { Icon } from '../shared/icons'
import type { DraftAmbiguity } from '../../services/voice/types'

export function QuestionCard({ amb, compact = false }: { amb: DraftAmbiguity; compact?: boolean }) {
  const { chooseOption, submitText, talking } = useAssistant()
  const [answer, setAnswer] = useState('')

  return (
    <div className={`question-card ${compact ? 'is-compact' : ''}`} role="group" aria-label={amb.question}>
      <p className="question-q">
        <Icon name="help" size={compact ? 13 : 15} />
        {amb.question}
      </p>

      {amb.choices.length > 0 && (
        <ol className="question-choices">
          {amb.choices.map((choice, i) => (
            <li key={choice.id}>
              <button type="button" className="btn btn-small question-choice" onClick={() => chooseOption(amb.id, choice.id)}>
                <span className="question-num" aria-hidden="true">
                  {i + 1}
                </span>
                {choice.label}
              </button>
            </li>
          ))}
        </ol>
      )}

      <form
        className="question-free"
        onSubmit={(e) => {
          e.preventDefault()
          submitText(answer)
          setAnswer('')
        }}
      >
        <input
          className="text-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={
            amb.choices.length > 0
              ? tr('Atau jawab sendiri, ketik atau bicara…', 'Or answer in your own words, typed or spoken…')
              : tr('Jawab dengan ketik atau bicara…', 'Answer by typing or speaking…')
          }
          aria-label={tr('Jawaban sendiri', 'Your own answer')}
          disabled={talking}
        />
        <button type="submit" className="btn btn-small" disabled={!answer.trim() || talking}>
          <Icon name="send" size={13} />
          <span className="sr-only">{tr('Kirim jawaban', 'Send answer')}</span>
        </button>
      </form>
      <p className="question-hint">
        {amb.choices.length > 0
          ? tr('Sebut nomornya, atau jelaskan sendiri.', 'Say the number, or explain yourself.')
          : tr('Bicara atau ketik jawabannya.', 'Speak or type your answer.')}
      </p>
    </div>
  )
}
