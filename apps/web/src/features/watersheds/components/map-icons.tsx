/** White glyph on a colored badge, drawn in a 24 × 24 box. */
const badge = (color: string, glyph: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">` +
  `<circle cx="12" cy="12" r="10.5" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>` +
  `${glyph}</svg>`;

const STROKE = 'fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"';

/** Map and legend icons. Source icons are named after the SAGA `tipo`. */
export const MAP_ICONS = {
  operator: badge(
    '#0D47A1',
    '<path d="M6.8 12.4 12 8l5.2 4.4V17h-3.4v-3h-3.6v3H6.8z" fill="#FFFFFF"/>',
  ),
  naciente: badge(
    '#0288D1',
    '<path d="M12 6.3c2.3 3 3.8 5 3.8 6.8a3.8 3.8 0 0 1-7.6 0c0-1.8 1.5-3.8 3.8-6.8z" fill="#FFFFFF"/>',
  ),
  // A pipe going down into the ground, so it does not read as a building.
  pozo: badge(
    '#00796B',
    `<path d="M12 6.4v6.8M9.4 10.6 12 13.2l2.6-2.6M7.6 15.6h8.8M9.6 17.8h4.8" ${STROKE}/>`,
  ),
  superficial: badge(
    '#1565C0',
    `<path d="M6.8 10.2q1.3-1.5 2.6 0t2.6 0 2.6 0 2.6 0M6.8 14.2q1.3-1.5 2.6 0t2.6 0 2.6 0 2.6 0" ${STROKE}/>`,
  ),
  'sin clasificar': badge('#78909C', '<circle cx="12" cy="12" r="2.6" fill="#FFFFFF"/>'),
} as const;
export type MapIconId = keyof typeof MAP_ICONS;

export const iconUrl = (id: MapIconId) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MAP_ICONS[id])}`;

/** Decodes every icon as an image the map can register (2× for sharp screens). */
export function loadMapIcons(): Promise<[MapIconId, HTMLImageElement][]> {
  return Promise.all(
    (Object.keys(MAP_ICONS) as MapIconId[]).map(
      (id) =>
        new Promise<[MapIconId, HTMLImageElement]>((resolve, reject) => {
          const image = new Image(48, 48);
          image.onload = () => resolve([id, image]);
          image.onerror = reject;
          image.src = iconUrl(id);
        }),
    ),
  );
}

const LEGEND_ICONS: Record<string, MapIconId[]> = {
  operators: ['operator'],
  springs: ['naciente'],
  otherSources: ['pozo', 'superficial', 'sin clasificar'],
};

/** Legend mark of a map layer: its icons, or a line for streams. */
export function LegendMark({ layer }: { layer: string }) {
  const icons = LEGEND_ICONS[layer];
  if (!icons) return <span className={`legend-mark legend-${layer}`} aria-hidden="true" />;
  return (
    <span className="legend-icons" aria-hidden="true">
      {icons.map((id) => (
        <img key={id} src={iconUrl(id)} alt="" width={18} height={18} />
      ))}
    </span>
  );
}
