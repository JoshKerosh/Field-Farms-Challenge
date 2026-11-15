import { Download, PlusCircle, Share2, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { CONSERVATION_ACTIONS } from '../../data/engine/farm';
import { fmtInt } from '../../data/engine/format';
import {
  EVENT_TYPES,
  RECORD_TYPES,
  VIEW_ROLES,
  flowChart,
  flowFromBucket,
  flowProjection,
  institutionalView,
  recordDateText,
  recordTitle,
  recordsCsv,
  sharedBoard,
  type RecordType,
} from '../../data/engine/records';
import { nearbySources } from '../../data/engine/watershed';
import { PageHeader } from '../../shared/ui';
import { useField } from '../context/FieldContext';

export function RecordsPage() {
  const {
    ds,
    ctx,
    recs,
    addRecord,
    loadDemoRecords,
    clearDemoRecords,
    role,
    setRole,
    acts,
    plan,
    fluc,
    flucShare,
    setFlucShare,
  } = useField();

  const sourcesNear = useMemo(() => (ds && ctx ? nearbySources(ds, ctx) : []), [ds, ctx]);
  const [recTab, setRecTab] = useState<RecordType>('caudal');
  const [srcIndex, setSrcIndex] = useState<number>(() => sourcesNear[0]?.i ?? 0);
  const [dateVal, setDateVal] = useState('2026-11-14');
  const [liters, setLiters] = useState('20');
  const [seconds, setSeconds] = useState('4');
  const [actionPick, setActionPick] = useState(CONSERVATION_ACTIONS[0].t);
  const [eventPick, setEventPick] = useState<string>(EVENT_TYPES[0]);
  const [rainMm, setRainMm] = useState('35');
  const [note, setNote] = useState('');
  const [share, setShare] = useState(true);
  const [formMsg, setFormMsg] = useState('');

  const effectiveSource = sourcesNear.find((s) => s.i === srcIndex) ?? sourcesNear[0];
  const effectiveSrcIdx = effectiveSource?.i ?? 0;

  if (!ds || !ctx || !plan || !fluc) return null;

  const bucketFlow = flowFromBucket(liters, seconds);
  const chart = flowChart(ds, ctx, recs);
  const projection = flowProjection(ds, recs);
  const nDone = Object.values(acts).filter((v) => v === 'hecho').length;
  const activeOp: [string, number] = effectiveSource
    ? (ds.sources.ops[effectiveSource.q[2]] ?? ['ASADA local', 0])
    : ['ASADA local', 0];
  const asadaBoard = sharedBoard(
    ds,
    ctx,
    recs,
    { i: effectiveSrcIdx, op: activeOp[0], conn: fmtInt(activeOp[1]) },
    nDone,
  );
  const instBoard = institutionalView(ds, ctx, plan, fluc.nReg);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(recordsCsv(ds, recs))}`;
  const hasDemoRecs = recs.some((r) => r.demo);

  const handleSaveRecord = (e: FormEvent) => {
    e.preventDefault();
    if (recTab === 'caudal') {
      if (!bucketFlow.valid || bucketFlow.lps <= 0) {
        setFormMsg('Escribe los litros del balde y los segundos mayores a cero.');
        return;
      }
      addRecord({
        t: 'caudal',
        v: Math.round(bucketFlow.lps * 100) / 100,
        src: effectiveSrcIdx,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(`Caudal guardado: ${bucketFlow.lpsText} L/s.`);
    } else if (recTab === 'accion') {
      addRecord({
        t: 'accion',
        v: actionPick,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(`Acción registrada: ${actionPick}.`);
    } else if (recTab === 'evento') {
      addRecord({
        t: 'evento',
        v: eventPick,
        src: effectiveSrcIdx,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(`Evento registrado: ${eventPick}.`);
    } else {
      const mm = Number(rainMm);
      if (!(mm > 0)) {
        setFormMsg('Ingresa la lluvia en milímetros mayor a cero.');
        return;
      }
      addRecord({
        t: 'lluvia',
        v: Math.round(mm * 10) / 10,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(`Lluvia registrada: ${mm} mm.`);
    }
    setNote('');
  };

  return (
    <div className="v10-stack">
      <PageHeader
        title="Registros del agua y monitoreo"
        intro="Anota mediciones de caudal con balde, lluvia, acciones o eventos. Cambia de vista entre Finquero, ASADA e Institución."
      />

      <fieldset className="role-selector">
        <legend>Ver tablero según tu rol</legend>
        <div>
          {VIEW_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className="filter-button"
              aria-pressed={role === r.id}
              onClick={() => setRole(r.id)}
            >
              {r.n}
            </button>
          ))}
        </div>
      </fieldset>

      {role === 'asada' && (
        <section className="v10-card" aria-labelledby="asada-board-title">
          <div className="v10-map-toolbar">
            <div>
              <h2 id="asada-board-title">Tablero de la ASADA · {asadaBoard.op}</h2>
              <p className="v10-muted">
                Fuente prioritaria: {asadaBoard.src} ({asadaBoard.conn} conexiones abastecidas)
              </p>
            </div>
            <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
              Último caudal: {asadaBoard.lastQ}
            </span>
          </div>
          <div className="v10-grid-4">
            <div className="v10-kpi">
              <span className="v10-small">Fincas en recarga (simulado)</span>
              <span className="v10-kpi-num">{asadaBoard.farms}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Con acciones activas</span>
              <span className="v10-kpi-num">{asadaBoard.care}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Eventos compartidos</span>
              <span className="v10-kpi-num">{asadaBoard.events}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Acciones compartidas</span>
              <span className="v10-kpi-num">{asadaBoard.actions}</span>
            </div>
          </div>
          <p className="v10-muted">{asadaBoard.trend}</p>
        </section>
      )}

      {role === 'inst' && (
        <section className="v10-card" aria-labelledby="inst-board-title">
          <h2 id="inst-board-title">Vista institucional (CNE · Municipalidades · FLUC)</h2>
          <div className="v10-grid-4">
            <div className="v10-kpi">
              <span className="v10-small">Nacientes con baja simulada (&ge;15 %)</span>
              <span className="v10-kpi-num">{instBoard.nDown}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Nacientes en prioridad en subcuenca</span>
              <span className="v10-kpi-num">{instBoard.prot}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Organizaciones FLUC en región</span>
              <span className="v10-kpi-num">{instBoard.fl}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">Subcuenca activa</span>
              <strong style={{ fontSize: '1rem' }}>{ctx.sub.n}</strong>
            </div>
          </div>
          <ul className="v10-list">
            {instBoard.list.map((item) => (
              <li key={item.t} className="v10-list-item">
                <div className="v10-map-toolbar">
                  <strong>{item.t}</strong>
                  <span className="v10-tag" style={{ background: '#F8E1DE', color: '#8E2A21' }}>
                    {item.d}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="v10-card" aria-labelledby="new-rec-title">
        <div className="v10-map-toolbar">
          <h2 id="new-rec-title">
            <PlusCircle size={18} aria-hidden="true" /> Registrar una medición o acción
          </h2>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              onClick={() => loadDemoRecords(effectiveSrcIdx)}
            >
              Cargar 5 meses de ejemplo
            </button>
            {hasDemoRecs && (
              <button type="button" className="v10-pill-btn" onClick={clearDemoRecords}>
                Quitar ejemplos
              </button>
            )}
          </div>
        </div>

        <div className="v10-pill-row" role="tablist" aria-label="Tipo de registro">
          {RECORD_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              role="tab"
              aria-selected={recTab === rt.id}
              className="v10-pill-btn"
              onClick={() => setRecTab(rt.id)}
            >
              <span aria-hidden="true">{rt.ic}</span> {rt.n}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveRecord} className="v10-stack">
          <div className="v10-form-grid">
            <div className="v10-field">
              <label htmlFor="rec-date">Fecha</label>
              <input
                id="rec-date"
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                required
              />
            </div>

            {(recTab === 'caudal' || recTab === 'evento') && sourcesNear.length > 0 && (
              <div className="v10-field">
                <label htmlFor="rec-src">Fuente de agua cercana</label>
                <select
                  id="rec-src"
                  value={effectiveSrcIdx}
                  onChange={(e) => setSrcIndex(Number(e.target.value))}
                >
                  {sourcesNear.map((s) => (
                    <option key={s.i} value={s.i}>
                      {s.q[4]} ({s.d < 1 ? `${Math.round(s.d * 1000)} m` : `${s.d.toFixed(1)} km`})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recTab === 'caudal' && (
              <>
                <div className="v10-field">
                  <label htmlFor="rec-liters">Capacidad del balde (litros)</label>
                  <input
                    id="rec-liters"
                    type="number"
                    step="0.5"
                    min="1"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                  />
                </div>
                <div className="v10-field">
                  <label htmlFor="rec-seconds">Segundos que tarda en llenarse</label>
                  <input
                    id="rec-seconds"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                  />
                  <span className="v10-small">
                    Caudal calculado:{' '}
                    <strong>
                      {bucketFlow.valid ? `${bucketFlow.lpsText} L/s (${bucketFlow.lpdText} L/día)` : '—'}
                    </strong>
                  </span>
                </div>
              </>
            )}

            {recTab === 'accion' && (
              <div className="v10-field">
                <label htmlFor="rec-action">Acción realizada</label>
                <select
                  id="rec-action"
                  value={actionPick}
                  onChange={(e) => setActionPick(e.target.value)}
                >
                  {CONSERVATION_ACTIONS.map((a) => (
                    <option key={a.id} value={a.t}>
                      {a.t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recTab === 'evento' && (
              <div className="v10-field">
                <label htmlFor="rec-event">Evento observado</label>
                <select
                  id="rec-event"
                  value={eventPick}
                  onChange={(e) => setEventPick(e.target.value)}
                >
                  {EVENT_TYPES.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recTab === 'lluvia' && (
              <div className="v10-field">
                <label htmlFor="rec-rain">Lluvia medida (mm)</label>
                <input
                  id="rec-rain"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={rainMm}
                  onChange={(e) => setRainMm(e.target.value)}
                />
              </div>
            )}

            <div className="v10-field">
              <label htmlFor="rec-note">Nota breve (opcional)</label>
              <input
                id="rec-note"
                type="text"
                maxLength={120}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej. Agua clara, después de aguacero…"
              />
            </div>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <span>Marcar para compartir en el tablero comunal (local en este dispositivo)</span>
          </label>

          <div className="v10-pill-row">
            <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
              Guardar registro
            </button>
            {formMsg && (
              <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }} role="status">
                {formMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="v10-grid-2">
        <article className="v10-card">
          <h2>Lluvia (NASA POWER) y caudal medido</h2>
          {chart.has ? (
            <>
              <p className="v10-muted">{chart.text}</p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Lluvia NASA (mm)</th>
                      <th>Caudal (L/s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.bars.map((b) => (
                      <tr key={b.m}>
                        <th>{b.m}</th>
                        <td>{b.rain} mm</td>
                        <td>{b.hasQ ? `${b.qv} L/s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="v10-muted">
              Anota al menos 2 mediciones de caudal (o pulsa «Cargar 5 meses de ejemplo») para comparar la tendencia de la naciente con la lluvia de NASA POWER.
            </p>
          )}
        </article>

        <article className="v10-card">
          <h2>Proyección del caudal a 2 meses</h2>
          {projection.has ? (
            <div className={`v10-alert-box ${projection.down ? 'v10-alert-box--danger' : 'v10-alert-box--ok'}`}>
              <strong>Tendencia: {projection.slope}</strong>
              <p>{projection.msg}</p>
              <a
                href={projection.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="v10-pill-btn"
                style={{ width: 'fit-content', marginTop: 6 }}
              >
                <Share2 size={15} aria-hidden="true" /> Enviar aviso por WhatsApp
              </a>
            </div>
          ) : (
            <p className="v10-muted">
              Con 3 o más mediciones de caudal en fechas distintas se activa la proyección lineal preventiva para avisar a la ASADA antes de que baje el nivel.
            </p>
          )}
        </article>
      </section>

      <section className="v10-card" aria-labelledby="rec-list-title">
        <div className="v10-map-toolbar">
          <h2 id="rec-list-title">Historial guardado ({recs.length})</h2>
          {recs.length > 0 && (
            <div className="v10-pill-row">
              <a className="v10-pill-btn" href={csvHref} download="registros-field-farms.csv">
                <Download size={16} aria-hidden="true" /> Exportar CSV
              </a>
              {hasDemoRecs && (
                <button type="button" className="v10-pill-btn" onClick={clearDemoRecords}>
                  <Trash2 size={16} aria-hidden="true" /> Borrar ejemplos
                </button>
              )}
            </div>
          )}
        </div>

        {recs.length === 0 ? (
          <p className="v10-muted">Todavía no hay mediciones guardadas en este dispositivo.</p>
        ) : (
          <ul className="v10-list">
            {recs.map((r) => (
              <li key={r.id} className="v10-list-item">
                <div className="v10-map-toolbar">
                  <strong>{recordTitle(ds, r)}</strong>
                  <span className="v10-small">{recordDateText(r)}</span>
                </div>
                {r.note && <span className="v10-muted">{r.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="v10-card" aria-labelledby="fluc-title">
        <div className="v10-map-toolbar">
          <div>
            <h2 id="fluc-title">Red de ASADAS y FLUC en {fluc.region}</h2>
            <p className="v10-muted">
              {fluc.nReg} organizaciones regionales activas en registro AyA, agrupando {fluc.nAsadas} ASADAS.
            </p>
          </div>
          <button
            type="button"
            className="v10-pill-btn"
            aria-pressed={flucShare}
            onClick={() => setFlucShare(!flucShare)}
          >
            {flucShare ? '✓ Compartiendo registros con la red (simulado)' : 'Compartir registros con la red'}
          </button>
        </div>

        <ul className="v10-list">
          {fluc.list.map((org) => (
            <li key={org.name} className="v10-list-item">
              <div className="v10-map-toolbar">
                <strong>{org.name}</strong>
                <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
                  <span aria-hidden="true" style={{ color: org.col }}>●</span> {org.kind}
                </span>
              </div>
              <span className="v10-small">
                {org.meta}
                {org.national ? ' · Alcance nacional' : ''}
                {org.hasStatus ? ` · ${org.status}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
