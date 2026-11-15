import { History, Share2, TriangleAlert } from 'lucide-react';
import { useField } from '../../../app/context/FieldContext';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader, PageLink } from '../../../shared/ui';
export function AlertsPage() {
  useMessageLanguage();
  const { ctx, alerts, demo } = useField();
  if (!ctx || !alerts) return null;
  return (
    <div className="v10-stack">
      <PageHeader
        title={message('ma1ac06114a36')}
        intro={message('m9a504b37701b', ctx.canton.n, ctx.sub.n)}
      />

      <section className="v10-hero-card" aria-labelledby="nino-face-title">
        <span className="v10-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
          <TriangleAlert size={14} aria-hidden="true" />
          {message('m6d5b42cd5718')}
          {alerts.caribe ? message('m89a4695c099e') : message('m552087b6a491')}
          {demo ? message('m2f8c77aebed4', demo) : ''}
        </span>
        <h2 id="nino-face-title" style={{ color: '#fff', fontSize: '1.35rem' }}>
          {alerts.face}
        </h2>
        <div className="v10-pill-row">
          <a
            href={alerts.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="v10-pill-btn"
            style={{ background: '#ffffff', color: '#0D3A4B', borderColor: '#ffffff' }}
          >
            <Share2 size={16} aria-hidden="true" />
            {message('mcec1b0702e1b')}
          </a>
          <PageLink to="/environment">{message('ma2c2049557a1')}</PageLink>
        </div>
      </section>

      <section className="v10-stack" aria-label={message('md9cd6157e5f4')}>
        {alerts.list.map((a) => (
          <details key={a.id} className="v10-card" open={a.defaultOpen}>
            <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
              <div className="v10-map-toolbar">
                <strong style={{ fontSize: '1.1rem' }}>
                  <span aria-hidden="true">{a.icon} </span>
                  {a.title}
                </strong>
                <span className="v10-tag" style={{ background: a.bg, color: a.fg }}>
                  {message('m43e040831eb9')}
                  {a.levelLabel}
                </span>
              </div>
              <p className="v10-muted" style={{ marginTop: 6 }}>
                {a.why}
              </p>
            </summary>

            <div
              className="v10-stack"
              style={{ marginTop: 10, paddingTop: 10, borderTop: message('m7db38a325a30') }}
            >
              <strong>{message('ma9a06f722ad0')}</strong>
              <ul className="v10-list">
                {a.recs.map((r) => (
                  <li key={r} className="v10-list-item">
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <span className="v10-small">
                {message('mc8bcd060bd0e')}
                {a.src}
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
