import { Check, Droplet, ShieldAlert, Sprout, Trees } from 'lucide-react';
import { CONSERVATION_ACTIONS } from '../../../data/engine/farm';
import { PageHeader, PageLink } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';

export function RestorationPage() {
  const {
    ctx,
    legal,
    journey,
    zoneAbove,
    acts,
    setActionStatus,
    apartos,
    setApartos,
    rotation,
    farm,
    plan,
  } = useField();

  if (!ctx || !legal || !journey || !zoneAbove || !rotation || !farm || !plan) return null;

  const doneCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'hecho').length;
  const planCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'plan').length;
  const maxMonthCap = Math.max(rotation.animals, ...rotation.months.map((m) => m.cap), 1);

  return (
    <div className="v10-stack">
      <PageHeader
        title="Cuidar el agua y los potreros"
        intro="Acciones prácticas en tu finca respaldadas por la Ley Forestal 7575, el estado satelital de tus orillas y la calculadora de rotación."
      />

      {/* Marco legal y zona vista desde arriba */}
      <section className="v10-grid-2" aria-label="Estado legal y satelital de tu finca">
        <article className="v10-alert-box" style={{ background: legal.bg, color: legal.col }}>
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1.05rem' }}>
            <ShieldAlert size={18} aria-hidden="true" /> {legal.t}
          </strong>
          <p>{legal.d}</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Fuente más cercana: {journey.src} ({journey.dist}) · {journey.op} ({journey.conn} conexiones).
          </span>
        </article>

        <article className="v10-alert-box" style={{ background: zoneAbove.bg, color: zoneAbove.col }}>
          <div className="v10-map-toolbar">
            <strong>Tu zona vista desde arriba (IGN + MODIS)</strong>
            <span className="v10-tag" style={{ background: '#ffffff', color: zoneAbove.col }}>
              {zoneAbove.tag}
            </span>
          </div>
          <strong>{zoneAbove.t}</strong>
          <p>{zoneAbove.d}</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{zoneAbove.verd}</span>
          {zoneAbove.tip && <span style={{ fontSize: '0.85rem' }}>{zoneAbove.tip}</span>}
        </article>
      </section>

      {/* El viaje de tu agua y caso real Nicoya */}
      <section className="v10-grid-2">
        <article className="v10-card">
          <h3>
            <Droplet size={18} aria-hidden="true" /> El viaje de tu agua
          </h3>
          <p className="v10-muted">
            El <strong>{journey.pct} %</strong> de las fuentes de tu subcuenca son agua subterránea ({journey.nNac} nacientes y {journey.nPozo} pozos; promedio nacional: {journey.pctPais} %).
          </p>
          <span className="v10-small">
            Cuidar los 15 m a cada lado de quebradas y los 100 m de nacientes asegura la infiltración limpia hacia la comunidad.
          </span>
        </article>

        <article className="v10-card" style={{ background: '#EEF5F0' }}>
          <h3>Caso real en Costa Rica: Nicoya y ASEPALECO</h3>
          <p className="v10-muted">
            En la península de Nicoya, finqueros y ASADAS junto a organizaciones locales lograron proteger y recuperar bosques ribereños alrededor de fuentes comunitarias, sosteniendo caudales durante veranos de El Niño.
          </p>
          <PageLink to="/benefits">Ver incentivos y PSA de Fonafifo</PageLink>
        </article>
      </section>

      {/* Catálogo de 8 acciones en finca */}
      <section aria-labelledby="actions-title">
        <div className="v10-map-toolbar" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="actions-title">
              <Sprout size={18} aria-hidden="true" /> Acciones prácticas en tu finca
            </h2>
            <p className="v10-muted">
              Marca lo que ya aplicas y lo que planeas iniciar. Se guarda automáticamente en este dispositivo.
            </p>
          </div>
          <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }}>
            {doneCount} hechas · {planCount} en plan
          </span>
        </div>

        <div className="v10-grid-2">
          {CONSERVATION_ACTIONS.map((a) => {
            const st = acts[a.id] || '';
            return (
              <article key={a.id} className="v10-card">
                <div className="v10-map-toolbar">
                  <h3>
                    <span aria-hidden="true">{a.ic} </span>
                    {a.t}
                  </h3>
                  {a.ley && (
                    <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
                      {a.ley}
                    </span>
                  )}
                </div>
                <p className="v10-muted">{a.d}</p>
                <span className="v10-small">Participa: {a.who}</span>
                <div className="v10-pill-row">
                  <button
                    type="button"
                    className="v10-pill-btn"
                    aria-pressed={st === 'hecho'}
                    onClick={() => setActionStatus(a.id, 'hecho')}
                  >
                    <Check size={14} aria-hidden="true" /> Ya lo hago
                  </button>
                  <button
                    type="button"
                    className="v10-pill-btn"
                    aria-pressed={st === 'plan'}
                    onClick={() => setActionStatus(a.id, 'plan')}
                  >
                    Lo voy a hacer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Calculadora de rotación de potreros */}
      {/* Plan de la subcuenca (antes en Mi cuenca) */}
      <section>
        <article className="v10-card">
          <h2>
            <Trees size={18} aria-hidden="true" /> Plan de regeneración para esta subcuenca
          </h2>
          <ul className="v10-list">
            {plan.actions.map((act) => (
              <li key={act.num} className="v10-list-item">
                <div className="v10-map-toolbar">
                  <strong>{act.t}</strong>
                  <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }}>
                    {act.when}
                  </span>
                </div>
                <span className="v10-muted">{act.d}</span>
                <span className="v10-small">
                  Impacto: {act.imp} · Responsable: {act.who}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="v10-card" aria-labelledby="rotation-title">
        <div className="v10-map-toolbar">
          <div>
            <h2 id="rotation-title">Calculadora de rotación de potreros (6 meses)</h2>
            <p className="v10-muted">
              Ajustada para <strong>{farm.name}</strong> ({rotation.ha} ha en uso, {rotation.animals} animales) con humedad actual del suelo (NASA POWER) y verdor MODIS ({rotation.now}).
            </p>
          </div>
          <div className="v10-field" style={{ minWidth: 210 }}>
            <label htmlFor="apartos-input">Número de apartos: {apartos}</label>
            <input
              id="apartos-input"
              type="range"
              min={2}
              max={24}
              value={apartos}
              onChange={(e) => setApartos(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="v10-grid-3">
          <div className="v10-kpi">
            <span className="v10-small">Descanso estimado hoy</span>
            <span className="v10-kpi-num">{rotation.rest} días</span>
            <span className="v10-small">Según humedad y verdor actual</span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">Ocupación por aparto</span>
            <span className="v10-kpi-num">{rotation.occ} días</span>
            <span className="v10-small">Con {apartos} apartos rotativos</span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">Capacidad mínima proyectada</span>
            <span className="v10-kpi-num">{rotation.minCap} cab.</span>
            <span className="v10-small">Mes más seco: {rotation.capMonth}</span>
          </div>
        </div>

        {rotation.warn && (
          <div className="v10-alert-box v10-alert-box--warn" role="status">
            <strong>Recomendación de manejo para El Niño</strong>
            <p>{rotation.warn}</p>
          </div>
        )}

        <div
          className="v10-bar-chart"
          role="img"
          aria-label={`Capacidad de carga estimada para los próximos 6 meses frente a tus ${rotation.animals} animales actuales.`}
        >
          {rotation.months.map((m) => (
            <div key={m.m} className="v10-bar-col">
              <div
                className="v10-bar"
                style={{
                  width: 30,
                  height: Math.max(12, Math.round((m.cap / maxMonthCap) * 76)),
                  background: m.col,
                }}
                title={`${m.m}: ${m.cap} animales · ${m.rest} días de descanso`}
              />
              <strong style={{ fontSize: '0.8125rem' }}>{m.m}</strong>
              <span className="v10-small">{m.cap} cab.</span>
              <span className="v10-small">{m.rest} d</span>
            </div>
          ))}
        </div>

        <div className="v10-pill-row">
          <PageLink to="/records" primary>
            Ir a registros de caudal y lluvia
          </PageLink>
        </div>
      </section>
    </div>
  );
}
