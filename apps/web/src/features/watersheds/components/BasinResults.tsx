import type { AreaShare } from '@field-farms/domain';
import type { ReactNode } from 'react';
import { copy, number } from '../../../i18n';
import type { BasinResult } from './explorer-result';

export const formatDistance = (m: number) => `${number(m, 0)} m`;
export const formatArea = (m2: number) =>
  m2 >= 10000 ? `${number(m2 / 10000, 2)} ha` : `${number(m2, 0)} m²`;

/** Text equivalent of the basins the map shows for the farm. */
export function BasinResults({ result }: { result: BasinResult }) {
  const c = copy.watershed.explorer;
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

      {result.pointBasin && (
        <Block label={c.basinWater}>
          {result.water.state === 'loading' && <p className="muted">{c.loadingBasinWater}</p>}
          {result.water.state === 'error' && <p className="muted">{c.waterError}</p>}
          {result.water.state === 'done' && (
            <>
              <h3>{c.basinWaterSummary(result.water.value.sources, result.water.value.springs)}</h3>
              <p className="muted">{c.basinOperators(result.water.value.operators)}</p>
            </>
          )}
        </Block>
      )}
    </section>
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

export function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="basin-block">
      <p className="basin-label">{label}</p>
      {children}
    </div>
  );
}
