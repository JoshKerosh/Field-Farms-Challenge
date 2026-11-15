import { localizedResource, message, useMessageLanguage } from '../../../i18n/messages';
/** White glyph on a colored badge, drawn in a 24 × 24 box. */
const badge = (color: string, glyph: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">` +
  message('m3562b598ccce', color) +
  `${glyph}</svg>`;
const STROKE = message('m88f63dc7c7e2');
/** Map and legend icons (SI-generated, see README "Use of Super Intelligence (SI)"). Source icons are named after the SAGA `tipo`. */
export const MAP_ICONS = localizedResource(
  () =>
    ({
      operator: badge('#0D47A1', message('med55b96e42cb')),
      naciente: badge('#0288D1', message('m9b7412e8ee7d')),
      // A pipe going down into the ground, so it does not read as a building.
      pozo: badge('#00796B', message('mdca9fe84de60', STROKE)),
      superficial: badge('#1565C0', message('m84aa205870d9', STROKE)),
      'sin clasificar': badge('#78909C', message('m6dce7416f0d4')),
    }) as const,
);
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
const LEGEND_ICONS: Record<string, MapIconId[]> = localizedResource(() => ({
  operators: ['operator'],
  springs: ['naciente'],
  otherSources: ['pozo', 'superficial', 'sin clasificar'],
}));
/** Legend mark of a map layer: its icons, or a line for streams. */
export function LegendMark({ layer }: { layer: string }) {
  useMessageLanguage();
  const icons = LEGEND_ICONS[layer];
  if (!icons) return <span className={message('mf38403818eca', layer)} aria-hidden="true" />;
  return (
    <span className="legend-icons" aria-hidden="true">
      {icons.map((id) => (
        <img key={id} src={iconUrl(id)} alt="" width={18} height={18} />
      ))}
    </span>
  );
}
