import { History, Share2, TriangleAlert } from 'lucide-react';
import { PageHeader, PageLink } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';

export function AlertsPage() {
  const { ctx, alerts, demo } = useField();
  if (!ctx || !alerts) return null;

  return (
    <div className="v10-stack">
      <PageHeader
        title="Alertas: las dos caras de El Niño"
        intro={`Riesgos de sequía, lluvias intensas y deslizamiento calculados para tu punto en ${ctx.canton.n} (${ctx.sub.n}).`}
      />

      <section className="v10-hero-card" aria-labelledby="nino-face-title">
        <span className="v10-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
          <TriangleAlert size={14} aria-hidden="true" /> Vertiente {alerts.caribe ? 'Caribe' : 'Pacífico'}
          {demo ? ` · Simulación activa (${demo})` : ''}
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
            <Share2 size={16} aria-hidden="true" /> Compartir alerta por WhatsApp
          </a>
          <PageLink to="/environment">Simular eventos extremos y ver satélite</PageLink>
        </div>
      </section>

      <section className="v10-stack" aria-label="Tarjetas de riesgo en tu finca">
        {alerts.list.map((a) => (
          <details key={a.id} className="v10-card" open={a.defaultOpen}>
            <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
              <div className="v10-map-toolbar">
                <strong style={{ fontSize: '1.1rem' }}>
                  <span aria-hidden="true">{a.icon} </span>
                  {a.title}
                </strong>
                <span className="v10-tag" style={{ background: a.bg, color: a.fg }}>
                  Riesgo: {a.levelLabel}
                </span>
              </div>
              <p className="v10-muted" style={{ marginTop: 6 }}>
                {a.why}
              </p>
            </summary>

            <div className="v10-stack" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-line)' }}>
              <strong>Qué hacer ahora:</strong>
              <ul className="v10-list">
                {a.recs.map((r) => (
                  <li key={r} className="v10-list-item">
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <span className="v10-small">Fuentes: {a.src}</span>
            </div>
          </details>
        ))}
      </section>

      <section className="v10-card" aria-labelledby="hist-title">
        <h2 id="hist-title">
          <History size={18} aria-hidden="true" /> Memoria histórica: sequía 2014–2015 en la cuenca {alerts.history.cuencaName}
        </h2>
        {alerts.history.hasReports ? (
          <>
            <p className="v10-muted">
              Durante El Niño anterior (2014–2015), se registraron <strong>{alerts.history.nCommunity}</strong> reportes comunitarios de falta de agua y <strong>{alerts.history.nInfra}</strong> en infraestructura dentro de esta cuenca.
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
            En la cuenca {alerts.history.cuencaName} no hubo reportes oficiales de falta de agua en 2014–2015. El reporte más cercano registrado fue en{' '}
            <strong>{alerts.history.nearest}</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
