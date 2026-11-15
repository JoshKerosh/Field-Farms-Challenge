import type { Feature, FeatureCollection, Point } from 'geojson';
import { copy, number } from '../../../i18n';
import type { OperatorProperties, WaterSourceProperties } from '../analysis/parcel-analysis';

export const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
export const collection = (features: Feature[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

export function withTooltip<G extends Point>(
  feature: Feature<G>,
  lines: (string | null)[],
): Feature<G> {
  return {
    ...feature,
    properties: { ...feature.properties, tooltip: lines.filter(Boolean).join('\n') },
  };
}

export function streamTooltip(name: string | null, kind: string): string {
  return name ? `${name}\n${kind}` : kind;
}

export function sourceTooltip(p: WaterSourceProperties): (string | null)[] {
  const c = copy.watershed.explorer;
  return [p.nombre, `${c.sourceKind[p.tipo]} · ${p.operador}`, sourceDetail(p.altitud, p.caudal)];
}

export function operatorTooltip(p: OperatorProperties): (string | null)[] {
  const c = copy.watershed.explorer;
  return [
    p.nombre,
    `${p.tipo} · ${p.zona}`,
    `${c.services(p.servicios)} · ${c.operatorTotals(p.fuentes, p.nacientes)}`,
  ];
}

export function sourceDetail(altitude: number | null, flow: number | null): string | null {
  const c = copy.watershed.explorer;
  const parts = [
    altitude ? c.altitude(number(altitude, 0)) : null,
    flow != null ? c.lastFlow(number(flow, 2)) : null,
  ];
  return parts.filter(Boolean).join(' · ') || null;
}
