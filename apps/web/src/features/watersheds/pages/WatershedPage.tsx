import { Droplet, Layers, MapPin, Waves } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { distText, fmtInt } from '../../../data/engine/format';
import { getGeo } from '../../../data/engine/geo';
import { RISK_LABEL, RISK_STYLE, terrainCards, type MapLayer, type SourceInfo } from '../../../data/engine/watershed';
import { copy, number } from '../../../i18n';
import { PageHeader } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';
import type { BasinExplorerRepository } from '../data/basin-explorer.repository';
import { farmSubbasins, subbasinLayers } from '../components/subbasin-layers';
import { RainOutlook } from '../components/RainOutlook';
import { WaterJourney } from '../components/WaterJourney';

// MapLibre and Turf load only when this page opens.
const BasinExplorer = lazy(() => import('../components/BasinExplorer'));
const SubbasinMap = lazy(() => import('../components/SubbasinMap'));

const LAYERS: { id: MapLayer; label: string; desc: string }[] = [
  { id: 'agua', label: 'Fuentes de agua', desc: 'Nacientes, pozos y halos de recarga de 1 km (SAGA).' },
  { id: 'restaurar', label: 'Dónde restaurar', desc: 'Celdas de 1,5 km priorizadas por verdor que baja, ríos sin bosque y cercanía a nacientes.' },
  { id: 'orillas', label: 'Ríos sin bosque', desc: 'Cobertura en la franja de 15 m de los ríos según IGN 1:5 000 (2017).' },
];

export function WatershedPage({ explorer }: { explorer: BasinExplorerRepository }) {
  const { ds, ctx, plan, basin, alerts, journey, farmSite, setSubbasin, demo } = useField();
  const [layer, setLayer] = useState<MapLayer>('agua');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const terrain = useMemo(() => (ds && ctx ? terrainCards(ds, ctx) : []), [ds, ctx]);
  const farmSubs = useMemo(
    () => (ds && farmSite ? farmSubbasins(ds, farmSite) : []),
    [ds, farmSite],
  );
  // The app's 3 km grid can place the farm in a neighboring sub-basin: show one it is really in.
  const subId = ctx?.subId;
  useEffect(() => {
    if (subId !== undefined && farmSubs.length && !farmSubs.some((s) => s.id === subId)) {
      setSubbasin(farmSubs[0].id);
    }
  }, [farmSubs, subId, setSubbasin]);
  const mapLayers = useMemo(
    () => (ds && ctx && plan ? subbasinLayers(getGeo(ds), ctx, plan, farmSite) : null),
    [ds, ctx, plan, farmSite],
  );

  if (!ds || !ctx || !plan || !basin || !alerts || !journey || !mapLayers) return null;

  const activeSource: SourceInfo | null =
    plan.sources.find((s) => s.i === selectedIdx) ?? plan.sources[0] ?? null;

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
          {/* The farm is chosen in "Mi finca"; here only its basins are shown. */}
          <BasinExplorer repository={explorer} site={farmSite} />
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

      <WaterJourney repository={explorer} site={farmSite} approx={journey} />

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

        {farmSubs.length > 1 && (
          <div className="v10-pill-row" role="group" aria-label={copy.subbasinChoice.label(farmSubs.length)}>
            <span className="v10-small" style={{ alignSelf: 'center' }}>
              {copy.subbasinChoice.label(farmSubs.length)}
            </span>
            {farmSubs.map((s) => (
              <button
                key={s.id}
                type="button"
                className="v10-pill-btn"
                aria-pressed={ctx.subId === s.id}
                onClick={() => {
                  setSelectedIdx(null);
                  setSubbasin(s.id);
                }}
              >
                {copy.subbasinChoice.option(s.name, number(s.share * 100, 0))}
              </button>
            ))}
          </div>
        )}

        <div className="v10-map-toolbar">
          <div className="v10-legend-row">
            <span className="v10-legend-dot">
              <i style={{ background: farmSite?.parcel ? '#C2185B' : '#17617C' }} /> Tu finca
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

        </div>

        <Suspense
          fallback={
            <p className="map-loading" role="status">
              {copy.watershed.mapLoading}
            </p>
          }
        >
          <SubbasinMap
            layers={mapLayers}
            layer={layer}
            selected={activeSource?.i ?? null}
            onSelect={setSelectedIdx}
            label={`Mapa de la subcuenca ${ctx.sub.n} en capa ${LAYERS.find((l) => l.id === layer)?.label}.`}
          />
        </Suspense>

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

      <RainOutlook ds={ds} reg={ctx.reg} demo={demo} />

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
