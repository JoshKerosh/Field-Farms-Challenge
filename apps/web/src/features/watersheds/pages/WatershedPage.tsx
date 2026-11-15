import { Droplet, Layers, MapPin, RotateCcw, Trees, Waves, ZoomIn, ZoomOut } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { distText, fmtInt } from '../../../data/engine/format';
import { RISK_LABEL, RISK_STYLE, terrainCards, type MapLayer, type SourceInfo } from '../../../data/engine/watershed';
import { copy } from '../../../i18n';
import { PageHeader, PageLink } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';
import type { BasinExplorerRepository } from '../data/basin-explorer.repository';

// MapLibre and Turf load only when this page opens.
const BasinExplorer = lazy(() => import('../components/BasinExplorer'));

const LAYERS: { id: MapLayer; label: string; desc: string }[] = [
  { id: 'agua', label: 'Fuentes de agua', desc: 'Nacientes, pozos y halos de recarga de 1 km (SAGA).' },
  { id: 'restaurar', label: 'Dónde restaurar', desc: 'Celdas de 1,5 km priorizadas por verdor que baja, ríos sin bosque y cercanía a nacientes.' },
  { id: 'orillas', label: 'Ríos sin bosque', desc: 'Cobertura en la franja de 15 m de los ríos según IGN 1:5 000 (2017).' },
];

export function WatershedPage({ explorer }: { explorer: BasinExplorerRepository }) {
  const { ds, ctx, plan, basin, alerts, journey, pickLatLon } = useField();
  const [layer, setLayer] = useState<MapLayer>('agua');
  const [zoom, setZoom] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const terrain = useMemo(() => (ds && ctx ? terrainCards(ds, ctx) : []), [ds, ctx]);

  if (!ds || !ctx || !plan || !basin || !alerts || !journey) return null;

  const pin = ctx.geo.toPx(ctx.loc.x, ctx.loc.y);
  const BW = ctx.geo.box.BW;
  const BH = ctx.geo.box.BH;
  const zw = BW / zoom;
  const zh = BH / zoom;
  const activeSource: SourceInfo | null =
    plan.sources.find((s) => s.i === selectedIdx) ?? plan.sources[0] ?? null;
  const activePx = activeSource ? ctx.geo.toPx(activeSource.q[0], activeSource.q[1]) : null;
  const focus = activePx ?? pin;
  const zvx = zoom <= 1 ? 0 : Math.max(0, Math.min(BW - zw, focus.x - zw / 2));
  const zvy = zoom <= 1 ? 0 : Math.max(0, Math.min(BH - zh, focus.y - zh / 2));
  const maxRain = Math.max(40, ...plan.forecast.flatMap((m) => [m.n, m.e]));

  return (
    <div className="v10-stack">
      <PageHeader
        title={`Subcuenca ${ctx.sub.n}`}
        intro={`Cuenca ${basin.name} · Vertiente ${ctx.caribe ? 'Caribe' : 'Pacífico'} · ${fmtInt(ctx.sub.ha)} ha · ${fmtInt(ctx.sub.serv)} conexiones registradas`}
      />

      <section className="v10-card" aria-labelledby="basin-explorer-title">
        <h2 id="basin-explorer-title">{copy.watershed.explorer.title}</h2>
        <p className="v10-muted">{copy.watershed.explorer.intro}</p>
        <Suspense
          fallback={
            <p className="map-loading" role="status">
              {copy.watershed.mapLoading}
            </p>
          }
        >
          {/* The chosen point also becomes the app's location, so this page and the others follow it. */}
          <BasinExplorer repository={explorer} onLocate={(lng, lat) => pickLatLon(lat, lng)} />
        </Suspense>
      </section>

      <section className="v10-hero-card" aria-labelledby="limits-title">
        <span className="v10-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
          <Waves size={14} aria-hidden="true" /> El agua no conoce límites de finca
        </span>
        <h2 id="limits-title" style={{ color: '#fff', fontSize: '1.35rem' }}>
          {basin.msg}
        </h2>
        <p>{plan.goal}</p>
      </section>

      <section className="v10-grid-3" aria-label="Indicadores de la subcuenca">
        <article className="v10-kpi">
          <span className="v10-small">Nacientes y fuentes SAGA</span>
          <span className="v10-kpi-num">{plan.sources.length}</span>
          <span className="v10-small">
            {plan.nNac} nacientes · {plan.nHi} en riesgo medio/alto
          </span>
        </article>
        <article className="v10-kpi">
          <span className="v10-small">Conexiones comunales</span>
          <span className="v10-kpi-num">{plan.conn}</span>
          <span className="v10-small">
            {plan.connRisk > 0 ? `${fmtInt(plan.connRisk)} en nacientes con prioridad` : 'Todas en fuentes de riesgo bajo'}
          </span>
        </article>
        <article className="v10-kpi">
          <span className="v10-small">Orillas de río sin bosque (IGN)</span>
          <span className="v10-kpi-num">{plan.rip.has ? `${plan.rip.kmNo} km` : 'Sin tramos'}</span>
          <span className="v10-small">
            {plan.rip.has ? `${plan.rip.haUrg} ha prioritarias para restaurar · NDVI ${plan.ndvi}` : `NDVI promedio ${plan.ndvi}`}
          </span>
        </article>
      </section>

      <section className="v10-card" aria-labelledby="hydro-title">
        <h2 id="hydro-title">Cómo viaja el agua desde tu potrero hasta la ASADA</h2>
        <svg
          viewBox="0 0 640 150"
          className="v10-svg-canvas"
          style={{ background: '#EFF6F2' }}
          role="img"
          aria-label={`Diagrama del viaje del agua: la lluvia se infiltra en tu finca, recarga el acuífero y alimenta la fuente ${journey.src} a ${journey.dist}, administrada por ${journey.op}.`}
        >
          <path d="M0,78 Q160,55 320,88 T640,104 L640,150 L0,150 Z" fill="#C7DFCE" />
          <path d="M0,108 Q180,98 340,114 T640,124 L640,150 L0,150 Z" fill="#9BC9DC" opacity="0.7" />
          <path
            d="M110,68 C170,115 280,118 390,106 C450,100 500,98 555,102"
            fill="none"
            stroke="#17617C"
            strokeWidth="4"
            className="v10-flow-anim"
          />
          <circle cx="110" cy="64" r="10" fill="#2E7A43" />
          <text x="110" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill="#16231C">
            Tu finca
          </text>
          <text x="110" y="48" textAnchor="middle" fontSize="11" fill="#46574C">
            Infiltración en suelo
          </text>

          <circle cx="345" cy="108" r="11" fill="#17617C" />
          <text x="345" y="76" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0D3A4B">
            {journey.src.slice(0, 26)}
          </text>
          <text x="345" y="90" textAnchor="middle" fontSize="11" fill="#46574C">
            A {journey.dist}
          </text>

          <rect x="505" y="78" width="110" height="44" rx="10" fill="#FFFFFF" stroke="#17617C" strokeWidth="2" />
          <text x="560" y="98" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0D3A4B">
            {journey.op.slice(0, 18)}
          </text>
          <text x="560" y="113" textAnchor="middle" fontSize="11" fill="#46574C">
            {journey.conn} conexiones
          </text>
        </svg>
      </section>

      <section className="v10-svg-box" aria-labelledby="map-layers-title">
        <div className="v10-map-toolbar">
          <div>
            <h2 id="map-layers-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} aria-hidden="true" /> Mapa interactivo de la subcuenca
            </h2>
            <p className="v10-small">{LAYERS.find((l) => l.id === layer)?.desc}</p>
          </div>
          <div className="v10-pill-row">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                type="button"
                className="v10-pill-btn"
                aria-pressed={layer === l.id}
                onClick={() => setLayer(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="v10-map-toolbar">
          <div className="v10-legend-row">
            <span className="v10-legend-dot">
              <i style={{ background: '#17617C' }} /> Tu finca
            </span>
            {layer === 'agua' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#2F7FC1' }} /> Riesgo bajo
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#E0A030' }} /> Riesgo medio
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} /> Riesgo alto
                </span>
              </>
            )}
            {layer === 'restaurar' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} /> Prioridad alta (restaurar primero)
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#F6D98B' }} /> Prioridad media
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#CFE6D3' }} /> Prioridad baja
                </span>
              </>
            )}
            {layer === 'orillas' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} /> Orilla sin bosque
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#F2A65A' }} /> Bosque a medias
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#2E7A43' }} /> Orilla con bosque
                </span>
              </>
            )}
          </div>

          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              aria-label="Acercar subcuenca"
              onClick={() => setZoom((z) => Math.min(4, z * 2))}
            >
              <ZoomIn size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              aria-label="Alejar subcuenca"
              onClick={() => setZoom((z) => Math.max(1, z / 2))}
            >
              <ZoomOut size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              aria-label="Restablecer vista de subcuenca"
              onClick={() => setZoom(1)}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <svg
          viewBox={`${zvx.toFixed(1)} ${zvy.toFixed(1)} ${zw.toFixed(1)} ${zh.toFixed(1)}`}
          className="v10-svg-canvas"
          style={{ maxHeight: 360 }}
          role="img"
          aria-label={`Mapa de la subcuenca ${ctx.sub.n} en capa ${LAYERS.find((l) => l.id === layer)?.label}.`}
        >
          <g>
            <svg viewBox={ctx.geo.vb} width={BW} height={BH} preserveAspectRatio="none">
              <path d={ctx.geo.d} fill="#F4F8F5" stroke="#5A7566" strokeWidth="1.5" />
            </svg>
          </g>

          {layer === 'restaurar' &&
            plan.tilesRestaurar.map((t, i) => (
              <rect
                key={`rest-${i}`}
                x={t.x}
                y={t.y}
                width={9}
                height={9}
                fill={t.col}
                fillOpacity={0.72}
                rx={1.5}
              />
            ))}

          {layer === 'orillas' &&
            plan.tilesOrillas.map((t, i) => (
              <rect
                key={`ori-${i}`}
                x={t.x}
                y={t.y}
                width={9}
                height={9}
                fill={t.col}
                fillOpacity={0.76}
                rx={1.5}
              />
            ))}

          {layer === 'agua' &&
            plan.halos.map((h, i) => (
              <circle
                key={`halo-${i}`}
                cx={h.x}
                cy={h.y}
                r={12}
                fill={h.col}
                fillOpacity={0.14}
                stroke={h.col}
                strokeOpacity={0.45}
                strokeDasharray="3 3"
              />
            ))}

          {plan.sources.map((s) => {
            const pt = ctx.geo.toPx(s.q[0], s.q[1]);
            const style = RISK_STYLE[s.risk];
            return (
              <g
                key={s.i}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedIdx(s.i)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={activeSource?.i === s.i ? 7.5 : 5}
                  fill={style[1]}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          <circle cx={pin.x} cy={pin.y} r={9} fill="#17617C" fillOpacity={0.22} />
          <circle cx={pin.x} cy={pin.y} r={5} fill="#17617C" stroke="#FFFFFF" strokeWidth="2" />
        </svg>

        {activeSource ? (
          <div
            className="v10-alert-box"
            style={{ background: RISK_STYLE[activeSource.risk][2], color: RISK_STYLE[activeSource.risk][3] }}
          >
            <div className="v10-map-toolbar">
              <strong>
                <Droplet size={15} aria-hidden="true" /> {activeSource.q[4]} ({activeSource.kind})
              </strong>
              <span className="v10-tag" style={{ background: '#fff', color: RISK_STYLE[activeSource.risk][3] }}>
                {RISK_LABEL[activeSource.risk]}
              </span>
            </div>
            <span>
              Operador: {activeSource.op[0]} · {fmtInt(activeSource.op[1])} conexiones · A {distText(activeSource.distKm)} de tu finca · {activeSource.why}
            </span>
          </div>
        ) : (
          <p className="v10-muted">No hay fuentes SAGA georreferenciadas dentro de los límites de esta subcuenca.</p>
        )}

        {plan.sources.length > 1 && (
          <div className="v10-pill-row" aria-label="Seleccionar fuente de la subcuenca">
            {plan.sources.slice(0, 6).map((s) => (
              <button
                key={s.i}
                type="button"
                className="v10-pill-btn"
                aria-pressed={activeSource?.i === s.i}
                onClick={() => setSelectedIdx(s.i)}
              >
                <MapPin size={14} aria-hidden="true" /> {s.q[4]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="v10-grid-2">
        <article className="v10-card">
          <h2>Lluvia esperada en tu zona (El Niño vs normal)</h2>
          <p className="v10-muted">{plan.forecastTxt}</p>
          <div className="v10-bar-chart" role="img" aria-label={`Comparación de lluvia de 6 meses: ${plan.forecastTxt}`}>
            {plan.forecast.map((m) => (
              <div key={m.m} className="v10-bar-col">
                <div className="v10-bar-stack">
                  <div
                    className="v10-bar"
                    style={{ height: Math.max(8, Math.round((m.n / maxRain) * 76)), background: '#9AB8C7' }}
                    title={`Normal ${m.m}: ${m.n} mm`}
                  />
                  <div
                    className="v10-bar"
                    style={{ height: Math.max(8, Math.round((m.e / maxRain) * 76)), background: '#17617C' }}
                    title={`Con El Niño ${m.m}: ${m.e} mm`}
                  />
                </div>
                <strong style={{ fontSize: '0.8125rem' }}>{m.m}</strong>
                <span className="v10-small">{m.e} mm</span>
              </div>
            ))}
          </div>
          <div className="v10-legend-row">
            <span className="v10-legend-dot">
              <i style={{ background: '#9AB8C7' }} /> Promedio 1991–2025
            </span>
            <span className="v10-legend-dot">
              <i style={{ background: '#17617C' }} /> Año El Niño (NASA POWER)
            </span>
          </div>
        </article>

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
          <PageLink to="/care" primary>
            Ir a acciones en mi finca
          </PageLink>
        </article>
      </section>

      <section aria-labelledby="terrain-title">
        <h2 id="terrain-title" style={{ marginBottom: 12 }}>
          Condición del suelo y agua en tu punto
        </h2>
        <div className="v10-grid-3">
          {terrain.map((card) => (
            <article key={card.k} className="v10-card">
              <div className="v10-map-toolbar">
                <span className="v10-small">{card.k}</span>
                <span className="v10-tag" style={{ background: '#EEF3EF', color: '#16231C' }}>
                  <span aria-hidden="true" style={{ color: card.col }}>●</span> Estado
                </span>
              </div>
              <h3>{card.title}</h3>
              <p className="v10-muted">{card.text}</p>
              <span className="v10-small">{card.src}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
