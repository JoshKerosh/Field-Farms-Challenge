import { copy } from '../../../i18n';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { STREAMS_RADIUS_M, WATER_RADIUS_M } from '../../watersheds/analysis/parcel-analysis';
import { Block, formatArea, formatDistance } from '../../watersheds/components/BasinResults';
import { LOW_ACCURACY_M, type FarmResult } from '../../watersheds/components/explorer-result';
/** Text equivalent of everything the map shows for the farm. */
export function FarmResults({ result }: { result: FarmResult }) {
  useMessageLanguage();
  const c = copy.watershed.explorer;
  const parcel = result.parcel.state === 'done' ? result.parcel.value : null;
  const coords = message('m57c10ec2d27b', result.lat.toFixed(5), result.lng.toFixed(5));
  const lowAccuracy = (result.accuracyM ?? 0) > LOW_ACCURACY_M;
  return (
    <section className="basin-results" aria-live="polite">
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

      <p className={lowAccuracy ? message('m2665094c5cbc') : 'muted'}>
        {result.accuracyM
          ? `${c.yourLocation(coords, Math.round(result.accuracyM))}${lowAccuracy ? message('m951b558ae74c', c.lowAccuracy) : ''}`
          : c.pointChosen(coords)}
      </p>
    </section>
  );
}
function WaterSummary({
  water,
}: {
  water: Extract<
    FarmResult['water'],
    {
      state: 'done';
    }
  >['value'];
}) {
  useMessageLanguage();
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
          ? message('mb3bb3b6f18c9', nearest.name, c.sourceKind[nearest.kind])
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
