import { Crosshair, MapPin, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  EMPTY_FARM_FORM,
  EXAMPLE_FARMS,
  FARM_ACTIVITIES,
  FARM_FLOODING,
  FARM_WATER,
  type ExampleFarmKey,
  type FarmFormInput,
} from '../../../data/engine/farm';
import { getGeo, ringPath } from '../../../data/engine/geo';
import { norm } from '../../../data/engine/format';
import { PageHeader, PageLink } from '../../../shared/ui';
import { myFarmToForm, useField } from '../../../app/context/FieldContext';

type PickMode = 'mapa' | 'cuenca' | 'lugar';

const QUICK_PLACES: { name: string; lat: number; lon: number }[] = [
  { name: 'Upala', lat: 10.8, lon: -85.08 },
  { name: 'Sarapiquí', lat: 10.52, lon: -84.0 },
  { name: 'Los Chiles', lat: 11.0, lon: -84.7 },
  { name: 'Liberia', lat: 10.6, lon: -85.4 },
  { name: 'Pérez Zeledón', lat: 9.37, lon: -83.7 },
];

export function FarmPage() {
  const {
    ds,
    ctx,
    approx,
    pickLocation,
    pickLatLon,
    farmKey,
    setFarmKey,
    myFarm,
    farm,
    saveMyFarm,
    siteFloodsFlag,
  } = useField();

  const [mode, setMode] = useState<PickMode>('mapa');
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [geoMsg, setGeoMsg] = useState('');
  const [selectedCu, setSelectedCu] = useState<number>(ctx?.cuIdx ?? 0);

  const [formInput, setFormInput] = useState<FarmFormInput>(() =>
    myFarm ? myFarmToForm(myFarm) : EMPTY_FARM_FORM,
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaved, setFormSaved] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const geo = useMemo(() => (ds ? getGeo(ds) : null), [ds]);

  const subsInCuenca = useMemo(() => {
    if (!ds) return [];
    return ds.territory.subs
      .map((s, id) => ({ id, s }))
      .filter(({ s, id }) => {
        const cu = s.cu !== undefined ? s.cu : id;
        return cu === selectedCu;
      })
      .sort((a, b) => a.s.n.localeCompare(b.s.n, 'es'));
  }, [ds, selectedCu]);

  const placeMatches = useMemo(() => {
    if (!ds) return [];
    const q = norm(searchQ.trim());
    if (!q) return ds.territory.places.slice(0, 8);
    return ds.territory.places
      .filter((p) => norm(`${p[0]} ${p[1]} ${p[2]}`).includes(q))
      .slice(0, 12);
  }, [ds, searchQ]);

  if (!ds || !ctx || !geo || !farm) return null;

  const W = ds.territory.W;
  const H = ds.territory.H;
  const vw = W / zoom;
  const vh = H / zoom;
  const cx = center ? center.x : ctx.loc.x;
  const cy = center ? center.y : ctx.loc.y;
  const vx = zoom <= 1 ? 0 : Math.max(0, Math.min(W - vw, cx - vw / 2));
  const vy = zoom <= 1 ? 0 : Math.max(0, Math.min(H - vh, cy - vh / 2));

  const handleMapClick = (e: MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    const x = vx + rx * vw;
    const y = vy + ry * vh;
    const ok = pickLocation({ x, y });
    if (ok) {
      setCenter({ x, y });
      setGeoMsg('');
    } else {
      setGeoMsg('Ese punto quedó fuera de las cuencas de Costa Rica. Haz clic dentro del territorio.');
    }
  };

  const handleGeolocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Tu navegador no tiene geolocalización disponible. Usa el mapa o el buscador.');
      return;
    }
    setGeoMsg('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ok = pickLatLon(pos.coords.latitude, pos.coords.longitude, false);
        if (ok) {
          const next = geo.llToLocal(pos.coords.latitude, pos.coords.longitude);
          setCenter(next);
          setZoom(4);
          setGeoMsg('Ubicación actualizada con tu GPS.');
        } else {
          setGeoMsg('Tu GPS parece estar fuera de Costa Rica; prueba elegir un lugar de ejemplo.');
        }
      },
      () => {
        setGeoMsg('No se pudo obtener permiso de GPS. Marca tu finca en el mapa o busca tu distrito.');
      },
      { enableHighAccuracy: false, timeout: 7000 },
    );
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = saveMyFarm(formInput);
    if (!res.ok) {
      setFormErrors(res.errors);
      setFormSaved(false);
    } else {
      setFormErrors({});
      setFormSaved(true);
    }
  };

  return (
    <div className="v10-stack">
      <PageHeader
        title="Mi finca y ubicación"
        intro="Paso 1: ubica dónde está tu finca en Costa Rica. Paso 3: elige un perfil de ejemplo o registra los datos de tu finca."
      />

      <section className="v10-card" aria-label="Ubicación seleccionada">
        <div className="v10-map-toolbar">
          <div>
            <span className="v10-small">Subcuenca y cantón activos</span>
            <h2 style={{ fontSize: '1.25rem' }}>
              {ctx.sub.n} · {ctx.canton.n}
            </h2>
            <p className="v10-muted">
              Cuenca {ctx.cuenca?.n ?? '—'} · Vertiente {ctx.caribe ? 'Caribe' : 'Pacífico'} · Uso del suelo clase {ctx.clsRaw}
              {siteFloodsFlag ? ' · Zona con potencial de inundación' : ''}
              {approx ? ' · Ubicación aproximada por distrito' : ''}
            </p>
          </div>
          <PageLink to="/watershed" primary>
            Ver plan de mi cuenca
          </PageLink>
        </div>
      </section>

      <section className="v10-card" aria-labelledby="step1-title">
        <div className="v10-map-toolbar">
          <h2 id="step1-title">Paso 1: ¿Dónde está tu finca?</h2>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={mode === 'mapa'}
              onClick={() => setMode('mapa')}
            >
              Mapa del país
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={mode === 'cuenca'}
              onClick={() => setMode('cuenca')}
            >
              Elegir cuenca
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={mode === 'lugar'}
              onClick={() => setMode('lugar')}
            >
              Buscar distrito
            </button>
            <button type="button" className="v10-pill-btn v10-pill-btn--forest" onClick={handleGeolocation}>
              <Crosshair size={16} aria-hidden="true" /> Usar mi GPS
            </button>
          </div>
        </div>

        <div className="v10-pill-row" aria-label="Lugares de ejemplo rápido">
          <span className="v10-small" style={{ alignSelf: 'center' }}>
            Ejemplos rápidos:
          </span>
          {QUICK_PLACES.map((qp) => (
            <button
              key={qp.name}
              type="button"
              className="v10-pill-btn"
              onClick={() => {
                pickLatLon(qp.lat, qp.lon, false);
                const loc = geo.llToLocal(qp.lat, qp.lon);
                setCenter(loc);
                setZoom(3);
                setGeoMsg(`Mostrando zona de ${qp.name}.`);
              }}
            >
              <MapPin size={14} aria-hidden="true" /> {qp.name}
            </button>
          ))}
        </div>

        {geoMsg && (
          <p className="v10-alert-box v10-alert-box--info" role="status">
            {geoMsg}
          </p>
        )}

        {mode === 'mapa' && (
          <div className="v10-svg-box">
            <div className="v10-map-toolbar">
              <span className="v10-small">Haz clic en cualquier punto dentro de Costa Rica para ubicar tu finca.</span>
              <div className="v10-pill-row">
                <button
                  type="button"
                  className="v10-pill-btn"
                  aria-label="Acercar mapa"
                  onClick={() => {
                    setCenter(ctx.loc);
                    setZoom((z) => Math.min(8, z * 2));
                  }}
                >
                  <ZoomIn size={16} aria-hidden="true" /> Acercar
                </button>
                <button
                  type="button"
                  className="v10-pill-btn"
                  aria-label="Alejar mapa"
                  onClick={() => setZoom((z) => Math.max(1, z / 2))}
                >
                  <ZoomOut size={16} aria-hidden="true" /> Alejar
                </button>
                <button
                  type="button"
                  className="v10-pill-btn"
                  aria-label="Ver todo el país"
                  onClick={() => {
                    setZoom(1);
                    setCenter(null);
                  }}
                >
                  <RotateCcw size={16} aria-hidden="true" /> País completo
                </button>
              </div>
            </div>
            <svg
              ref={svgRef}
              viewBox={`${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`}
              className="v10-svg-canvas"
              style={{ maxHeight: 380, cursor: 'crosshair' }}
              role="img"
              aria-label={`Mapa de cuencas hidrográficas de Costa Rica. Ubicación actual: ${ctx.sub.n}, ${ctx.canton.n}.`}
              onClick={handleMapClick}
            >
              <path d={geo.allPath()} fill="#DCE7DF" stroke="#6E8577" strokeWidth={Math.max(2, 6 / zoom)} />
              <path
                d={ringPath(ctx.sub.r[0])}
                fill="#A8D0DC"
                fillOpacity={0.7}
                stroke="#17617C"
                strokeWidth={Math.max(3, 8 / zoom)}
              />
              <circle
                cx={ctx.loc.x}
                cy={ctx.loc.y}
                r={Math.max(18, 55 / zoom)}
                fill="#E0A030"
                fillOpacity={0.28}
                stroke="#8E2A21"
                strokeWidth={Math.max(2, 6 / zoom)}
              />
              <circle cx={ctx.loc.x} cy={ctx.loc.y} r={Math.max(7, 22 / zoom)} fill="#8E2A21" />
            </svg>
          </div>
        )}

        {mode === 'cuenca' && (
          <div className="v10-form-grid">
            <div className="v10-field">
              <label htmlFor="sel-cuenca">Cuenca hidrográfica (34 oficiales)</label>
              <select
                id="sel-cuenca"
                value={selectedCu}
                onChange={(e) => setSelectedCu(Number(e.target.value))}
              >
                {ds.territory.cuencas.map((c, idx) => (
                  <option key={c.n} value={idx}>
                    {c.n}
                  </option>
                ))}
              </select>
            </div>
            <div className="v10-field">
              <label htmlFor="sel-subcuenca">Subcuenca ({subsInCuenca.length} disponibles)</label>
              <select
                id="sel-subcuenca"
                value={ctx.subId}
                onChange={(e) => {
                  const nextId = Number(e.target.value);
                  const sub = ds.territory.subs[nextId];
                  if (sub) {
                    pickLocation({ x: sub.c[0], y: sub.c[1] }, { subId: nextId, approx: true });
                    setCenter({ x: sub.c[0], y: sub.c[1] });
                    setGeoMsg(`Subcuenca seleccionada: ${sub.n}.`);
                  }
                }}
              >
                {subsInCuenca.map(({ id, s }) => (
                  <option key={`${s.n}-${id}`} value={id}>
                    {s.n} ({s.nf} fuentes)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === 'lugar' && (
          <div className="v10-stack">
            <div className="v10-field">
              <label htmlFor="place-search">Buscar por distrito, cantón o provincia</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Search size={18} aria-hidden="true" />
                <input
                  id="place-search"
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Ejemplo: Upala, Aguas Claras, San Carlos, Nicoya…"
                />
              </div>
            </div>
            <div className="v10-pill-row">
              {placeMatches.map((p, idx) => {
                const label = p[0] ? `${p[0]}, ${p[1]} (${p[2]})` : `${p[1]} (${p[2]})`;
                return (
                  <button
                    key={`${label}-${idx}`}
                    type="button"
                    className="v10-pill-btn"
                    onClick={() => {
                      pickLocation({ x: p[3], y: p[4] }, { approx: true });
                      setCenter({ x: p[3], y: p[4] });
                      setZoom(4);
                      setGeoMsg(`Ubicación fijada en ${label}.`);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="v10-card" aria-labelledby="step3-title">
        <h2 id="step3-title">Paso 3: Perfil de tu finca</h2>
        <p className="v10-muted">
          Los 3 perfiles iniciales son de ejemplo (simulados) para probar los cálculos. Si completas el formulario con tu finca real, se guarda en este dispositivo.
        </p>

        <div className="v10-pill-row" role="group" aria-label="Perfiles de finca">
          {(Object.keys(EXAMPLE_FARMS) as ExampleFarmKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="v10-pill-btn"
              aria-pressed={farmKey === key}
              onClick={() => setFarmKey(key)}
            >
              {EXAMPLE_FARMS[key].name}
            </button>
          ))}
          {myFarm && (
            <button
              type="button"
              className="v10-pill-btn v10-pill-btn--forest"
              aria-pressed={farmKey === 'mia'}
              onClick={() => setFarmKey('mia')}
            >
              ★ {myFarm.name || 'Mi finca'}
            </button>
          )}
        </div>

        <div className="v10-grid-3">
          <div className="v10-kpi">
            <span className="v10-small">Finca activa</span>
            <strong style={{ fontSize: '1.1rem' }}>{farm.name}</strong>
            <span className="v10-small">{farm.who}</span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">Área y siembra</span>
            <span className="v10-kpi-num">{farm.ha} ha</span>
            <span className="v10-small">{farm.cult} ha cultivables / forraje</span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">Ganado y actividad</span>
            <span className="v10-kpi-num">{farm.animals} cab.</span>
            <span className="v10-small">{farm.tipo}</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="v10-stack" noValidate>
          <h3>{myFarm ? 'Editar datos de mi finca' : 'Registrar mi finca real'}</h3>
          <div className="v10-form-grid">
            <div className="v10-field">
              <label htmlFor="fm-name">Nombre de la finca (opcional)</label>
              <input
                id="fm-name"
                type="text"
                maxLength={40}
                value={formInput.name}
                onChange={(e) => setFormInput((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Finca El Zapote"
              />
            </div>

            <div className="v10-field">
              <label htmlFor="fm-act">Actividad principal</label>
              <select
                id="fm-act"
                value={formInput.act}
                onChange={(e) => setFormInput((f) => ({ ...f, act: e.target.value }))}
              >
                <option value="">Elige una actividad…</option>
                {FARM_ACTIVITIES.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
              {formErrors.act && (
                <span className="v10-field-error" role="alert">
                  {formErrors.act}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-ha">Hectáreas totales</label>
              <input
                id="fm-ha"
                type="number"
                step="0.5"
                min="0.1"
                value={formInput.ha}
                onChange={(e) => setFormInput((f) => ({ ...f, ha: e.target.value }))}
                placeholder="Ej. 18"
              />
              {formErrors.ha && (
                <span className="v10-field-error" role="alert">
                  {formErrors.ha}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-cult">Hectáreas de cultivo o forraje</label>
              <input
                id="fm-cult"
                type="number"
                step="0.5"
                min="0.1"
                value={formInput.cult}
                onChange={(e) => setFormInput((f) => ({ ...f, cult: e.target.value }))}
                placeholder="Ej. 10"
              />
              {formErrors.cult && (
                <span className="v10-field-error" role="alert">
                  {formErrors.cult}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-animals">Cantidad de cabezas de ganado</label>
              <input
                id="fm-animals"
                type="number"
                min="0"
                value={formInput.animals}
                onChange={(e) => setFormInput((f) => ({ ...f, animals: e.target.value }))}
                placeholder="0 si no hay ganado"
              />
              {formErrors.animals && (
                <span className="v10-field-error" role="alert">
                  {formErrors.animals}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-agua">¿De dónde toma agua la finca?</label>
              <select
                id="fm-agua"
                value={formInput.agua}
                onChange={(e) => setFormInput((f) => ({ ...f, agua: e.target.value }))}
              >
                <option value="">Opcional…</option>
                {FARM_WATER.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="v10-field">
              <label htmlFor="fm-ench">¿Se inunda o encharca en invierno?</label>
              <select
                id="fm-ench"
                value={formInput.ench}
                onChange={(e) => setFormInput((f) => ({ ...f, ench: e.target.value }))}
              >
                <option value="no">No</option>
                {FARM_FLOODING.filter((o) => o[0] !== 'no').map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="v10-pill-row">
            <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
              Guardar mi finca en este dispositivo
            </button>
            {formSaved && (
              <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }} role="status">
                ✓ Finca guardada y activada
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
