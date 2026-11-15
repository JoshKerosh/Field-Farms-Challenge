import type { FarmSite } from '../../app/context/FieldContext';

/** Reuse the selected parcel; no additional geographic request is needed. */
export function parcelHectares(site: FarmSite | null): number | null {
  const squareMetres = site?.parcel?.properties.shape_area;
  return typeof squareMetres === 'number' && Number.isFinite(squareMetres) && squareMetres > 0
    ? squareMetres / 10_000
    : null;
}
