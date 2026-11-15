import type { NearbyWaterSource } from '@field-farms/domain';
import { bbox, circle } from '@turf/turf';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FarmSite } from '../../../app/context/FieldContext';
import type { WaterJourney as ApproxJourney } from '../../../data/engine/watershed';
import { copy, number } from '../../../i18n';
import {
  nearbyWater,
  searchZone,
  toParcel,
  type Area,
  type OperatorProperties,
} from '../analysis/parcel-analysis';
import type { BasinExplorerRepository } from '../data/basin-explorer.repository';
import { iconUrl, type MapIconId } from './map-icons';

/** Basins whose sources are searched: those within this distance of the farm. */
const SEARCH_M = 2000;

interface Nearest {
  source: NearbyWaterSource;
  operator: OperatorProperties | null;
}

/** Nearest SAGA source to the farm's boundary (or point), with the operator that runs it. */
async function findNearest(repository: BasinExplorerRepository, site: FarmSite) {
  const area: Area = site.parcel ?? circle([site.lng, site.lat], 1, { units: 'meters' });
  const [w, s, e, n] = bbox(searchZone(area, SEARCH_M));
  const basins = await repository.listBasins();
  const numbers = basins.features
    .filter((f) => {
      const [bw, bs, be, bn] = bbox(f);
      return bw <= e && be >= w && bs <= n && bn >= s;
    })
    .map((f) => f.properties.cuenca_no);
  const [files, operators] = await Promise.all([
    Promise.all(numbers.map((number) => repository.listWaterSources(number))),
    repository.listOperators(),
  ]);
  // A radius of 0 m keeps only sources inside the farm, or else the single nearest one.
  const [source] = nearbyWater(
    area,
    files.flatMap((f) => f.features),
    [],
    0,
  ).sources;
  if (!source) return null;
  const operator = operators.features.find((f) => f.properties.ideo === source.operatorId);
  return { source, operator: operator?.properties ?? null };
}

const distance = (m: number) => (m >= 1000 ? `${number(m / 1000, 1)} km` : `${number(m, 0)} m`);

/** How the water goes from the farm to the nearest source and the ASADA that runs it. */
export function WaterJourney({
  repository,
  site,
  approx,
}: {
  repository: BasinExplorerRepository;
  site: FarmSite | null;
  /** The app's estimate from its local grid, used while no farm has been located. */
  approx: ApproxJourney;
}) {
  const c = copy.journey;
  const [nearest, setNearest] = useState<Nearest | null | 'loading' | 'error'>(null);

  useEffect(() => {
    if (!site) return void setNearest(null);
    let cancelled = false;
    setNearest('loading');
    findNearest(repository, site).then(
      (found) => cancelled || setNearest(found),
      () => cancelled || setNearest('error'),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, site]);

  const farmNumber = site?.parcel ? toParcel(site.parcel).farmNumber : null;
  const farmName = farmNumber ? c.farmNumber(farmNumber) : c.farm;
  const real = typeof nearest === 'object' && nearest ? nearest : null;
  const step = real
    ? {
        // Source icons are named after the SAGA kind.
        icon: real.source.kind as MapIconId,
        name: real.source.name,
        kind: copy.watershed.explorer.sourceKind[real.source.kind],
        where: real.source.distanceM === 0 ? c.inside : c.distance(distance(real.source.distanceM)),
        operator: real.source.operatorName,
        services: real.operator?.servicios ?? null,
      }
    : {
        icon: 'naciente' as MapIconId,
        name: approx.src,
        kind: null,
        where: c.approxDistance(approx.dist),
        operator: approx.op,
        services: null,
      };

  return (
    <section className="v10-card water-journey" aria-labelledby="hydro-title">
      <h2 id="hydro-title">{c.title}</h2>
      {nearest === 'loading' && (
        <p className="v10-muted" role="status">
          {c.loading}
        </p>
      )}
      {nearest === 'error' && <p className="v10-muted">{c.error}</p>}
      {nearest !== 'loading' && (
        <p className="water-journey-lead">
          {real
            ? c.lead(farmName, step.name, step.kind ?? '', step.where, step.operator)
            : site
              ? c.none
              : c.approxLead(step.name, step.where, step.operator)}
        </p>
      )}

      {(real || !site) && (
        <JourneyDiagram
          label={c.diagramLabel(step.name, step.where, step.operator)}
          source={capitalize(step.kind ?? c.diagramSpring)}
          where={step.where}
          services={step.services}
        />
      )}

      {(real || !site) && (
        <ol className="water-journey-steps">
          <li>
            <span className="legend-mark legend-parcel" aria-hidden="true" />
            <strong>{farmNumber ? c.farmCardNumber(farmNumber) : c.farmCard}</strong>
            <span className="v10-small">{c.farmStep}</span>
          </li>
          <li aria-hidden="true" className="water-journey-arrow">
            <ArrowRight size={20} />
          </li>
          <li>
            <img src={iconUrl(step.icon)} alt="" width={28} height={28} />
            <span className="v10-tag water-journey-badge">
              {real ? c.nearestBadge : c.approxBadge}
            </span>
            <strong>{step.name}</strong>
            <span className="v10-small">{[step.kind, step.where].filter(Boolean).join(' · ')}</span>
          </li>
          <li aria-hidden="true" className="water-journey-arrow">
            <ArrowRight size={20} />
          </li>
          <li>
            <img src={iconUrl('operator')} alt="" width={28} height={28} />
            <strong>{step.operator}</strong>
            <span className="v10-small">
              {step.services != null ? c.services(step.services) : c.operatorStep}
            </span>
          </li>
        </ol>
      )}

      <p className="v10-small">{real ? c.note : c.approxNote}</p>
    </section>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Illustration of the trip: rain soaks into the farm, flows underground to the source and
 * reaches the water operator. Labels stay short; full names are in the steps below.
 */
function JourneyDiagram({
  label,
  source,
  where,
  services,
}: {
  label: string;
  source: string;
  where: string;
  services: number | null;
}) {
  const c = copy.journey;
  return (
    <svg
      viewBox="0 0 640 150"
      className="v10-svg-canvas"
      style={{ background: '#EFF6F2' }}
      role="img"
      aria-label={label}
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
      <circle cx="110" cy="64" r="10" fill="#C2185B" />
      <text x="110" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill="#16231C">
        {c.farmCard}
      </text>
      <text x="110" y="48" textAnchor="middle" fontSize="11" fill="#46574C">
        {c.diagramSoil}
      </text>

      <circle cx="345" cy="108" r="11" fill="#17617C" />
      <text x="345" y="76" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0D3A4B">
        {c.diagramNearest(source)}
      </text>
      <text x="345" y="90" textAnchor="middle" fontSize="11" fill="#46574C">
        {where}
      </text>

      <rect
        x="490"
        y="78"
        width="140"
        height="44"
        rx="10"
        fill="#FFFFFF"
        stroke="#17617C"
        strokeWidth="2"
      />
      <text x="560" y="98" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0D3A4B">
        {c.diagramOperator}
      </text>
      <text x="560" y="113" textAnchor="middle" fontSize="11" fill="#46574C">
        {services != null ? c.diagramServices(services) : c.diagramCommunity}
      </text>
    </svg>
  );
}
