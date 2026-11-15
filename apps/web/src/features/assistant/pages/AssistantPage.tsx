import { RotateCcw, Send, Volume2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useField } from '../../../app/context/FieldContext';
import { QUICK_QUESTIONS, matchQuestion } from '../../../data/engine/assistant';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader } from '../../../shared/ui';
export function AssistantPage() {
  useMessageLanguage();
  const { ctx, journey, chatTurns, askAssistant, clearAssistant } = useField();
  const [questionText, setQuestionText] = useState('');
  if (!ctx || !journey) return null;
  const lastAnswer =
    chatTurns.length > 0 ? chatTurns[chatTurns.length - 1].answer : message('m150ec3cede4d');
  const speakLast = () => {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      ss.cancel();
      const u = new window.SpeechSynthesisUtterance(lastAnswer);
      u.lang = 'es-CR';
      u.rate = 0.92;
      ss.speak(u);
    } catch {
      // Speech synthesis not supported in this browser
    }
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = questionText.trim();
    if (!cleaned) return;
    const matched = matchQuestion(cleaned);
    askAssistant(matched, cleaned);
    setQuestionText('');
  };
  return (
    <div className="v10-stack">
      <PageHeader
        title={message('m1d569b0ffa7c')}
        intro={message('mf2e5c90ece62', ctx.sub.n, ctx.canton.n, journey.op)}
      />

      <section className="v10-card" aria-label={message('m00811cc1893b')}>
        <div className="v10-map-toolbar">
          <span className="v10-small">
            {message('mffc81e6b91f1')}
            {ctx.sub.n}
            {message('m893da92781ec')}
            {journey.src} ({journey.dist})
          </span>
          <div className="v10-pill-row">
            <button type="button" className="v10-pill-btn" onClick={speakLast}>
              <Volume2 size={16} aria-hidden="true" />
              {message('m6860ca9527d4')}
            </button>
            {chatTurns.length > 0 && (
              <button type="button" className="v10-pill-btn" onClick={clearAssistant}>
                <RotateCcw size={16} aria-hidden="true" />
                {message('mb64ce189ccd3')}
              </button>
            )}
          </div>
        </div>

        <div className="v10-stack" style={{ gap: 10 }}>
          <div
            className="v10-alert-box v10-alert-box--info"
            style={{ maxWidth: '85%', justifySelf: 'start' }}
          >
            <span>{message('mb33e2fe5ed32')}</span>
          </div>

          {chatTurns.map((turn, idx) => (
            <div key={idx} className="v10-stack" style={{ gap: 8 }}>
              <div
                style={{
                  maxWidth: '82%',
                  justifySelf: 'end',
                  background: '#17617C',
                  color: '#FFFFFF',
                  padding: message('m1319878ebef5'),
                  borderRadius: message('m1a522394d761'),
                }}
              >
                {turn.question}
              </div>
              <div
                style={{
                  maxWidth: '86%',
                  justifySelf: 'start',
                  background: '#FFFFFF',
                  border: message('m7db38a325a30'),
                  color: '#16231C',
                  padding: message('m1319878ebef5'),
                  borderRadius: message('m003464387f9f'),
                }}
              >
                {turn.answer}
              </div>
            </div>
          ))}
        </div>

        <div className="v10-pill-row" role="group" aria-label={message('ma3f351ce0580')}>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              className="v10-pill-btn"
              onClick={() => askAssistant(q.id, q.label)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="assistant-input" className="small-label" style={{ width: '100%' }}>
            {message('mc44b0d19338b')}
          </label>
          <input
            id="assistant-input"
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder={message('me1cf1b250f0d')}
            style={{
              flex: message('m912c40a14b30'),
              minHeight: 44,
              padding: message('m8193b8b5eb6b'),
              borderRadius: 'var(--radius-sm)',
              border: message('m030dde4fff3d'),
            }}
          />
          <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
            <Send size={16} aria-hidden="true" />
            {message('m8eec3555dd18')}
          </button>
        </form>
      </section>
    </div>
  );
}
