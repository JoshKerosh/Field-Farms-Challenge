import type { AreaShare } from '@field-farms/domain';
import type { ReactNode } from 'react';
import { copy, number } from '../../../i18n';
import { STREAMS_RADIUS_M, WATER_RADIUS_M } from '../analysis/parcel-analysis';
import { LOW_ACCURACY_M, type ExplorerResult } from './explorer-result';

export const formatDistance = (m: number) => `${number(m, 0)} m`;
export const formatArea = (m2: number) =>
  m2 >= 10000 ? `${number(m2 / 10000, 2)} ha` : `${number(m2, 0)} m²`;

/** Text equivalent of everything the map shows for the chosen point. */
export function BasinResults({ result }: { result: ExplorerResult }) {
  const c = copy.watershed.explorer;
  const parcel = result.parcel.state === 'done' ? result.parcel.value : null;
  const coords = `${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`;
  const lowAccuracy = (result.accuracyM ?? 0) > LOW_ACCURACY_M;

  return (
    <section className="basin-results" aria-live="polite">
      <Block label={c.basin}>
        {result.basinShares.length > 1 ? (
          <Shares
            title={c.inMany(result.basinShares.length, c.basinsNoun)}
            items={result.basinShares}
            detail={(s) => `${c.basinNumber(s.basinNumber)} · ${formatArea(s.areaM2)}`}
          />
        ) : result.pointBasin ? (
          <>
            <h3>{result.pointBasin.nombre}</h3>
            <p className="muted">
              {c.basinNumber(result.pointBasin.cuenca_no)} · {number(result.pointBasin.area_ha, 0)}{' '}
              ha
            </p>
          </>
        ) : (
          <>
            <h3>{c.outsideBasins}</h3>
            <p className="muted">{c.outsideBasinsDetail}</p>
          </>
        )}
      </Block>

      <Block label={c.subbasin}>
        {result.subbasinShares.length > 1 ? (
          <Shares
            title={c.inMany(result.subbasinShares.length, c.subbasinsNoun)}
            items={result.subbasinShares}
            detail={(s) => `${s.mainBasin} · ${c.slope(s.slope)} · ${formatArea(s.areaM2)}`}
          />
        ) : result.pointSubbasin ? (
          <>
            <h3>{result.pointSubbasin.nombre}</h3>
            <p className="muted">
              {result.pointSubbasin.gran_cuenca} · {c.slope(result.pointSubbasin.vertiente)} ·{' '}
              {number(result.pointSubbasin.hectareas, 1)} ha
            </p>
          </>
        ) : (
          <p className="muted">{c.noSubbasin}</p>
        )}
      </Block>

      <Block label={c.parcel}>
        {result.parcel.state === 'loading' && <p className="muted">{c.searchingParcel}</p>}
        {result.parcel.state === 'error' && <p className="muted">{c.parcelError}</p>}
        {result.parcel.state === 'done' &&
          (parcel ? (
            <>
              <h3>
                <span className="legend-mark legend-parcel" aria-hidden="true" />
                {parcel.info.isPublicRoad
                  ? c.publicRoad(parcel.info.farmNumber)
                  : c.parcelName(parcel.info.farmNumber)}
              </h3>
              <p className="muted">
                {c.parcelDetail(parcel.info.plan, formatArea(parcel.info.areaM2))}
              </p>
            </>
          ) : (
            <p className="muted">{c.noParcel}</p>
          ))}
      </Block>

      {parcel && (
        <Block label={c.streams(STREAMS_RADIUS_M)}>
          {result.streams.state === 'loading' && <p className="muted">{c.searchingWater}</p>}
          {result.streams.state === 'error' && <p className="muted">{c.streamsError}</p>}
          {result.streams.state === 'done' &&
            (result.streams.value.list.length ? (
              <>
                <h3>
                  {c.streamsSummary(
                    result.streams.value.list.length,
                    result.streams.value.list.filter((s) => s.distanceM === 0).length,
                  )}
                </h3>
                <ul className="share-list">
                  {result.streams.value.list.map((s) => (
                    <li key={s.id}>
                      <span>{s.name ?? s.kind}</span>
                      <strong>
                        {s.distanceM === 0
                          ? c.crosses(s.insideM)
                          : c.distance(formatDistance(s.distanceM))}
                      </strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">{c.noStreams}</p>
            ))}
        </Block>
      )}

      {parcel && result.water.state !== 'idle' && (
        <Block label={c.water(WATER_RADIUS_M)}>
          {result.water.state === 'loading' && <p className="muted">{c.searchingWater}</p>}
          {result.water.state === 'error' && <p className="muted">{c.waterError}</p>}
          {result.water.state === 'done' && <WaterSummary water={result.water.value} />}
        </Block>
      )}

      <p className={lowAccuracy ? 'muted warn' : 'muted'}>
        {result.accuracyM
          ? `${c.yourLocation(coords, Math.round(result.accuracyM))}${lowAccuracy ? `. ${c.lowAccuracy}` : ''}`
          : c.pointChosen(coords)}
      </p>
    </section>
  );
}

function WaterSummary({
  water,
}: {
  water: Extract<ExplorerResult['water'], { state: 'done' }>['value'];
}) {
  const c = copy.watershed.explorer;
  if (!water.sources.length) return <p className="muted">{c.noWater}</p>;
  const nearest = water.sources[0];
  const springs = water.sources.filter((s) => s.kind === 'naciente').length;
  const inside = water.sources.filter((s) => s.distanceM === 0);
  return (
    <>
      <h3>
        {water.nearestOutsideRadius
          ? c.waterNone(water.radiusM, formatDistance(nearest.distanceM))
          : c.waterSummary(water.sources.length, springs, inside.length)}
      </h3>
      <p className="muted">
        {water.nearestOutsideRadius
          ? `${nearest.name} (${c.sourceKind[nearest.kind]}). `
          : inside.length
            ? `${c.waterInside(inside.map((s) => s.name).join(', '))} `
            : ''}
        {c.proximity}
      </p>
      <ul className="share-list">
        {water.operators.map((o) => (
          <li key={o.id}>
            <span>
              {o.name}
              <small>
                {[
                  o.sources
                    ? water.nearestOutsideRadius
                      ? c.operatorOwnsNearest
                      : c.operatorSources(o.sources)
                    : null,
                  o.office
                    ? c.operatorOffice(
                        o.office.distanceM === 0
                          ? c.inParcelLong
                          : c.distance(formatDistance(o.office.distanceM)),
                      )
                    : null,
                  o.id,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </span>
            <strong>
              {o.distanceM === 0 ? c.inParcel : c.distance(formatDistance(o.distanceM))}
            </strong>
          </li>
        ))}
      </ul>
    </>
  );
}

function Shares<T extends AreaShare>({
  title,
  items,
  detail,
}: {
  title: string;
  items: T[];
  detail: (item: T) => string;
}) {
  const c = copy.watershed.explorer;
  return (
    <>
      <h3>{title}</h3>
      <p className="muted">{c.shareIntro}</p>
      <ul className="share-list">
        {items.map((item) => (
          <li key={item.name}>
            <span>
              {item.name}
              <small>{detail(item)}</small>
            </span>
            <strong>{number(item.percent, 1)} %</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="basin-block">
      <p className="basin-label">{label}</p>
      {children}
    </div>
  );
}
