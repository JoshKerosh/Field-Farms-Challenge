import { Droplet, Layers, MapPin, Waves } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useField } from '../../../app/context/FieldContext';
import { distText, fmtInt } from '../../../data/engine/format';
import { getGeo } from '../../../data/engine/geo';
import {
  RISK_LABEL,
  RISK_STYLE,
  terrainCards,
  type MapLayer,
  type SourceInfo,
} from '../../../data/engine/watershed';
import { copy, number } from '../../../i18n';
import {
  localizedResource,
  message,
  messageLanguage,
  useMessageLanguage,
} from '../../../i18n/messages';
import { PageHeader } from '../../../shared/ui';
import { RainOutlook } from '../components/RainOutlook';
import { farmSubbasins, subbasinLayers } from '../components/subbasin-layers';
import { WaterJourney } from '../components/WaterJourney';
import type { BasinExplorerRepository } from '../data/basin-explorer.repository';
// MapLibre and Turf load only when this page opens.
const BasinExplorer = lazy(() => import('../components/BasinExplorer'));
const SubbasinMap = lazy(() => import('../components/SubbasinMap'));
const LAYERS: {
  id: MapLayer;
  label: string;
  desc: string;
}[] = localizedResource(() => [
  { id: 'agua', label: message('m65f873eb7216'), desc: message('m992b306bff5a') },
  { id: 'restaurar', label: message('m5858dca281ee'), desc: message('m31c9cfade08a') },
  { id: 'orillas', label: message('mfc14a4ac2968'), desc: message('m863bfe33bfad') },
]);
export function WatershedPage({ explorer }: { explorer: BasinExplorerRepository }) {
  useMessageLanguage();
  const { ds, ctx, plan, basin, alerts, journey, farmSite, setSubbasin, demo } = useField();
  const [layer, setLayer] = useState<MapLayer>('agua');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const terrain = useMemo(
    () => (ds && ctx ? terrainCards(ds, ctx) : []),
    [ds, ctx, messageLanguage()],
  );
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
    [ds, ctx, plan, farmSite, messageLanguage()],
  );
  if (!ds || !ctx || !plan || !basin || !alerts || !journey || !mapLayers) return null;
  const activeSource: SourceInfo | null =
    plan.sources.find((s) => s.i === selectedIdx) ?? plan.sources[0] ?? null;
  return (
    <div className="v10-stack watershed-page">
      <PageHeader
        title={message('m4cbfd1e09d31', ctx.sub.n)}
        intro={message(
          'mf51b423186e9',
          basin.name,
          ctx.caribe ? message('m89a4695c099e') : message('m552087b6a491'),
          fmtInt(ctx.sub.ha),
          fmtInt(ctx.sub.serv),
        )}
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
          <Waves size={14} aria-hidden="true" />
          {message('m94cdd6e4ed39')}
        </span>
        <h2 id="limits-title" style={{ color: '#fff', fontSize: '1.35rem' }}>
          {basin.msg}
        </h2>
        <p>{plan.goal}</p>
      </section>

      <section className="v10-grid-3" aria-label={message('m058195f4387e')}>
        <article className="v10-kpi">
          <span className="v10-small">{message('m943bd46c90d4')}</span>
          <span className="v10-kpi-num">{plan.sources.length}</span>
          <span className="v10-small">
            {plan.nNac}
            {message('m2a631da57122')}
            {plan.nHi}
            {message('mdda90586e635')}
          </span>
        </article>
        <article className="v10-kpi">
          <span className="v10-small">{message('m7bd30e6f1392')}</span>
          <span className="v10-kpi-num">{plan.conn}</span>
          <span className="v10-small">
            {plan.connRisk > 0
              ? message('m6b6b7b7ae11d', fmtInt(plan.connRisk))
              : message('m7bf774477eb5')}
          </span>
        </article>
        <article className="v10-kpi">
          <span className="v10-small">{message('m72fa31ada5cf')}</span>
          <span className="v10-kpi-num">
            {plan.rip.has ? message('m930217329456', plan.rip.kmNo) : message('m8812a973c3ab')}
          </span>
          <span className="v10-small">
            {plan.rip.has
              ? message('m505fe23d95f0', plan.rip.haUrg, plan.ndvi)
              : message('m82d6f1bad185', plan.ndvi)}
          </span>
        </article>
      </section>

      <WaterJourney repository={explorer} site={farmSite} approx={journey} />

      <section className="v10-svg-box" aria-labelledby="map-layers-title">
        <div className="v10-map-toolbar">
          <div>
            <h2
              id="map-layers-title"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Layers size={18} aria-hidden="true" />
              {message('me45eee95dad0')}
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
          <div
            className="v10-pill-row"
            role="group"
            aria-label={copy.subbasinChoice.label(farmSubs.length)}
          >
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
              <i style={{ background: farmSite?.parcel ? '#C2185B' : '#17617C' }} />
              {message('mfd1c360fc8ac')}
            </span>
            {layer === 'agua' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#2F7FC1' }} />
                  {message('m4c65c6b78b08')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#E0A030' }} />
                  {message('m5693d7652b9a')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} />
                  {message('m9102470142ed')}
                </span>
              </>
            )}
            {layer === 'restaurar' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} />
                  {message('m9edaf7daca3f')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#F6D98B' }} />
                  {message('m20e6f9f3e49d')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#CFE6D3' }} />
                  {message('m7a7c06f556b9')}
                </span>
              </>
            )}
            {layer === 'orillas' && (
              <>
                <span className="v10-legend-dot">
                  <i style={{ background: '#D9534F' }} />
                  {message('mb6c303883c5f')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#F2A65A' }} />
                  {message('m450f5b270570')}
                </span>
                <span className="v10-legend-dot">
                  <i style={{ background: '#2E7A43' }} />
                  {message('m6b144e47f09d')}
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
            label={message('m3b810f5f01e1', ctx.sub.n, LAYERS.find((l) => l.id === layer)?.label)}
          />
        </Suspense>

        {activeSource ? (
          <div
            className="v10-alert-box"
            style={{
              background: RISK_STYLE[activeSource.risk][2],
              color: RISK_STYLE[activeSource.risk][3],
            }}
          >
            <div className="v10-map-toolbar">
              <strong>
                <Droplet size={15} aria-hidden="true" /> {activeSource.q[4]} ({activeSource.kind})
              </strong>
              <span
                className="v10-tag"
                style={{ background: '#fff', color: RISK_STYLE[activeSource.risk][3] }}
              >
                {RISK_LABEL[activeSource.risk]}
              </span>
            </div>
            <span>
              {message('m92aa31bd77ad')}
              {activeSource.op[0]} · {fmtInt(activeSource.op[1])}
              {message('m6cf88b22b8ef')}
              {distText(activeSource.distKm)}
              {message('mf926e18d7ab5')}
              {activeSource.why}
            </span>
          </div>
        ) : (
          <p className="v10-muted">{message('m42c51e8b7e0c')}</p>
        )}

        {plan.sources.length > 1 && (
          <div className="v10-pill-row" aria-label={message('m8282ff6744bc')}>
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
          {message('mf828c5a29c98')}
        </h2>
        <div className="v10-grid-3">
          {terrain.map((card) => (
            <article key={card.k} className="v10-card">
              <div className="v10-map-toolbar">
                <span className="v10-small">{card.k}</span>
                <span className="v10-tag" style={{ background: '#EEF3EF', color: '#16231C' }}>
                  <span aria-hidden="true" style={{ color: card.col }}>
                    ●
                  </span>
                  {message('m98e5acddb6c4')}
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
