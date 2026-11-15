import { History, TriangleAlert } from 'lucide-react';
import { validObservationDate } from '@field-farms/domain';
import { useField } from '../../../app/context/FieldContext';
import { evidenceLabel, evidenceValue } from '../../../data/engine/alerts';
import { date } from '../../../i18n';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader, PageLink } from '../../../shared/ui';
import './alerts.css';
import { AlertObservations } from '../components/AlertObservations';
export function AlertsPage() {
  useMessageLanguage();
  const { ctx, alerts } = useField();
  if (!ctx || !alerts) return null;
  return (
    <div className="v10-stack">
      <PageHeader
        title={message('alerts.title')}
        intro={message('alerts.intro', ctx.canton.n, ctx.sub.n)}
      />

      <section className="v10-hero-card" aria-labelledby="alert-mode-title">
        <span className="v10-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
          <TriangleAlert size={14} aria-hidden="true" />
          {message('alerts.realMode')}
        </span>
        <h2 id="alert-mode-title" style={{ color: '#fff', fontSize: '1.2rem' }} aria-live="polite">
          {alerts.face}
        </h2>
      </section>

      {alerts.sourceWarnings.length > 0 && (
        <section className="v10-card" aria-label={message('alerts.sourceUpdates')}>
          {alerts.sourceWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      )}

      <section className="v10-card" aria-label={message('alerts.futureTitle')}>
        <h2>{message('alerts.futureTitle')}</h2>
        <p>{message('alerts.futureNotice')}</p>
        <PageLink to="/environment">{message('ma2c2049557a1')}</PageLink>
      </section>

      <AlertObservations />

      <section className="v10-stack" aria-label={message('md9cd6157e5f4')}>
        {alerts.list.map((a) => (
          <details
            key={a.id}
            className="v10-card"
            open={a.severity !== 'indeterminate' && a.defaultOpen}
            data-alert-type={a.id}
          >
            <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
              <div className="v10-map-toolbar">
                <strong style={{ fontSize: '1.1rem' }}>
                  <span aria-hidden="true">{a.icon} </span>
                  {a.title}
                </strong>
                <span className="v10-tag" style={{ background: a.bg, color: a.fg }}>
                  {message('m43e040831eb9')}{' '}
                  {a.severity === 'indeterminate'
                    ? message('alerts.assessmentPending')
                    : a.levelLabel}
                </span>
              </div>
              <p className="v10-muted" style={{ marginTop: 6 }}>
                {a.why}
              </p>
            </summary>

            <div
              className="v10-stack"
              style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #DCE3DE' }}
            >
              {a.blockers.length > 0 && (
                <ul className="v10-list">
                  {a.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              )}
              {a.ruleConditions.length > 0 && (
                <ul>
                  {a.ruleConditions.map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>
              )}
              {a.ruleReferences.length > 0 && (
                <div>
                  <strong>{message('alerts.methodSources')}</strong>
                  <ul>
                    {a.ruleReferences.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {a.evidence.some((item) => item.value !== null) && (
                <>
                  <p className="v10-small alert-table-hint">{message('alerts.scrollHint')}</p>
                  <div
                    className="table-scroll"
                    role="region"
                    tabIndex={0}
                    aria-label={`${a.title}: ${message('alerts.indicators')}`}
                  >
                    <table className="alert-evidence-table">
                      <caption>{message('alerts.indicators')}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{message('alerts.indicators')}</th>
                          <th scope="col">{message('alerts.value')}</th>
                          <th scope="col">{message('alerts.state')}</th>
                          <th scope="col">{message('alerts.source')}</th>
                          <th scope="col">{message('alerts.date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.evidence
                          .filter((item) => item.value !== null)
                          .map((item) => (
                            <tr key={item.id}>
                              <th scope="row">{evidenceLabel(item.id)}</th>
                              <td>{evidenceValue(item)}</td>
                              <td>{message(`alerts.status.${item.status}`)}</td>
                              <td>
                                {item.provenance?.source ||
                                  `${message('alerts.expectedSource')}: ${item.expectedSource || message('alerts.sourcePending')}`}
                              </td>
                              <td>
                                {validObservationDate(item.observedStart) &&
                                validObservationDate(item.observedEnd)
                                  ? item.observedStart === item.observedEnd
                                    ? date(item.observedEnd)
                                    : `${date(item.observedStart)} – ${date(item.observedEnd)}`
                                  : message('alerts.noDate')}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p>
                {message('alerts.missingEvidence')}:{' '}
                {a.evidence
                  .filter((item) => item.value === null)
                  .map((item) => evidenceLabel(item.id))
                  .join(', ') || message('alerts.rulesPending')}
              </p>
              <strong>{message('alerts.generalRecommendations')}</strong>
              <ul className="v10-list">
                {a.recs.map((r) => (
                  <li key={r} className="v10-list-item">
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <span className="v10-small">
                {message('mc8bcd060bd0e')} {a.src}
              </span>
            </div>
          </details>
        ))}
      </section>

      <section className="v10-card" aria-labelledby="hist-title">
        <h2 id="hist-title">
          <History size={18} aria-hidden="true" />
          {message('m0cac613ec945')}
          {alerts.history.cuencaName}
        </h2>
        {alerts.history.hasReports ? (
          <>
            <p className="v10-muted">
              {message('m681a34a33226')}
              <strong>{alerts.history.nCommunity}</strong>
              {message('mb5b48af46660')}
              <strong>{alerts.history.nInfra}</strong>
              {message('m51fbe554db85')}
            </p>
            <ul className="v10-list">
              {alerts.history.list.map((h) => (
                <li key={`${h.title}-${h.detail}`} className="v10-list-item">
                  <strong>{h.title}</strong>
                  <span className="v10-muted">{h.detail}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="v10-muted">
            {message('m7cd3ce4ecedb')}
            {alerts.history.cuencaName}
            {message('m40c22574ad2f')} <strong>{alerts.history.nearest}</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
