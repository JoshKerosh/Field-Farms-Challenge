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
import { message, messageLanguage, useMessageLanguage } from '../../i18n/messages';
import { PageHeader } from '../../shared/ui';
import { useField } from '../context/FieldContext';
export function RecordsPage() {
  useMessageLanguage();
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
  const sourcesNear = useMemo(
    () => (ds && ctx ? nearbySources(ds, ctx) : []),
    [ds, ctx, messageLanguage()],
  );
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
    ? (ds.sources.ops[effectiveSource.q[2]] ?? [message('mdfa423b34ab2'), 0])
    : [message('mdfa423b34ab2'), 0];
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
        setFormMsg(message('m221309d3b880'));
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
      setFormMsg(message('m636815000314', bucketFlow.lpsText));
    } else if (recTab === 'accion') {
      addRecord({
        t: 'accion',
        v: actionPick,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(message('ma68054bbade4', actionPick));
    } else if (recTab === 'evento') {
      addRecord({
        t: 'evento',
        v: eventPick,
        src: effectiveSrcIdx,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(message('m596d65848e1f', eventPick));
    } else {
      const mm = Number(rainMm);
      if (!(mm > 0)) {
        setFormMsg(message('m5f1a35af9546'));
        return;
      }
      addRecord({
        t: 'lluvia',
        v: Math.round(mm * 10) / 10,
        d: dateVal,
        note: note.trim() || undefined,
        share,
      });
      setFormMsg(message('m04aa96478529', mm));
    }
    setNote('');
  };
  return (
    <div className="v10-stack">
      <PageHeader title={message('md75645157c9e')} intro={message('introRecordsPage')} />

      <fieldset className="role-selector">
        <legend>{message('m6ea89b060e1e')}</legend>
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
              <h2 id="asada-board-title">
                {message('m0d1239d50773')}
                {asadaBoard.op}
              </h2>
              <p className="v10-muted">
                {message('mb79b02a4c209')}
                {asadaBoard.src} ({asadaBoard.conn}
                {message('mc1906aaec70a')}
              </p>
            </div>
            <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
              {message('m3885d793d409')}
              {asadaBoard.lastQ}
            </span>
          </div>
          <div className="v10-grid-4">
            <div className="v10-kpi">
              <span className="v10-small">{message('m4e630454fb52')}</span>
              <span className="v10-kpi-num">{asadaBoard.farms}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('m30fb70be4f5f')}</span>
              <span className="v10-kpi-num">{asadaBoard.care}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('mf1baf36ece78')}</span>
              <span className="v10-kpi-num">{asadaBoard.events}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('m167ebfeb1d9b')}</span>
              <span className="v10-kpi-num">{asadaBoard.actions}</span>
            </div>
          </div>
          <p className="v10-muted">{asadaBoard.trend}</p>
        </section>
      )}

      {role === 'inst' && (
        <section className="v10-card" aria-labelledby="inst-board-title">
          <h2 id="inst-board-title">{message('md7815c31b45c')}</h2>
          <div className="v10-grid-4">
            <div className="v10-kpi">
              <span className="v10-small">{message('me2e7a2118ac8')}</span>
              <span className="v10-kpi-num">{instBoard.nDown}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('m651a4d32c51d')}</span>
              <span className="v10-kpi-num">{instBoard.prot}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('m65abde731c5e')}</span>
              <span className="v10-kpi-num">{instBoard.fl}</span>
            </div>
            <div className="v10-kpi">
              <span className="v10-small">{message('mcaafb7b09c14')}</span>
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
            <PlusCircle size={18} aria-hidden="true" />
            {message('m7053b8d97ffc')}
          </h2>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              onClick={() => loadDemoRecords(effectiveSrcIdx)}
            >
              {message('m64a79c8e1e91')}
            </button>
            {hasDemoRecs && (
              <button type="button" className="v10-pill-btn" onClick={clearDemoRecords}>
                {message('mca9a477fddd2')}
              </button>
            )}
          </div>
        </div>

        <div className="v10-pill-row" role="tablist" aria-label={message('mffc69bba602f')}>
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
              <label htmlFor="rec-date">{message('m93b2a9ef782c')}</label>
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
                <label htmlFor="rec-src">{message('m24f8aab5d9dd')}</label>
                <select
                  id="rec-src"
                  value={effectiveSrcIdx}
                  onChange={(e) => setSrcIndex(Number(e.target.value))}
                >
                  {sourcesNear.map((s) => (
                    <option key={s.i} value={s.i}>
                      {s.q[4]} (
                      {s.d < 1
                        ? message('mc444f0831828', Math.round(s.d * 1000))
                        : message('m930217329456', s.d.toFixed(1))}
                      )
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recTab === 'caudal' && (
              <>
                <div className="v10-field">
                  <label htmlFor="rec-liters">{message('m24d73e323da1')}</label>
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
                  <label htmlFor="rec-seconds">{message('mfe2f24a0f240')}</label>
                  <input
                    id="rec-seconds"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                  />
                  <span className="v10-small">
                    {message('m6b410412cbe5')}{' '}
                    <strong>
                      {bucketFlow.valid
                        ? message('m84533460c612', bucketFlow.lpsText, bucketFlow.lpdText)
                        : '—'}
                    </strong>
                  </span>
                </div>
              </>
            )}

            {recTab === 'accion' && (
              <div className="v10-field">
                <label htmlFor="rec-action">{message('maf3c627693cb')}</label>
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
                <label htmlFor="rec-event">{message('m9d477c349426')}</label>
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
                <label htmlFor="rec-rain">{message('m5de85dc4d3c0')}</label>
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
              <label htmlFor="rec-note">{message('m8a7fdf5bd719')}</label>
              <input
                id="rec-note"
                type="text"
                maxLength={120}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={message('m4f5a84b9d729')}
              />
            </div>
          </div>

          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={share}
              onChange={(e) => setShare(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <span>{message('m380c35df0b61')}</span>
          </label>

          <div className="v10-pill-row">
            <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
              {message('m73b38a657c47')}
            </button>
            {formMsg && (
              <span
                className="v10-tag"
                style={{ background: '#E2F1E5', color: '#1F5A32' }}
                role="status"
              >
                {formMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="v10-grid-2">
        <article className="v10-card">
          <h2>{message('mfbc890cc75aa')}</h2>
          {chart.has ? (
            <>
              <p className="v10-muted">{chart.text}</p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{message('m024261f9bfba')}</th>
                      <th>{message('mddab5aaa7fdd')}</th>
                      <th>{message('m8abd46522862')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.bars.map((b) => (
                      <tr key={b.m}>
                        <th>{b.m}</th>
                        <td>{b.rain} mm</td>
                        <td>{b.hasQ ? message('m5d031782b006', b.qv) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="v10-muted">{message('mc925dbbcf6b1')}</p>
          )}
        </article>

        <article className="v10-card">
          <h2>{message('m993b7288be55')}</h2>
          {projection.has ? (
            <div
              className={message(
                'm0321e84a4d5f',
                projection.down ? 'v10-alert-box--danger' : 'v10-alert-box--ok',
              )}
            >
              <strong>
                {message('m12a5ee47e691')}
                {projection.slope}
              </strong>
              <p>{projection.msg}</p>
              <a
                href={projection.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="v10-pill-btn"
                style={{ width: 'fit-content', marginTop: 6 }}
              >
                <Share2 size={15} aria-hidden="true" />
                {message('medb48ff90083')}
              </a>
            </div>
          ) : (
            <p className="v10-muted">{message('m6aae7329c4c7')}</p>
          )}
        </article>
      </section>

      <section className="v10-card" aria-labelledby="rec-list-title">
        <div className="v10-map-toolbar">
          <h2 id="rec-list-title">
            {message('m6bf5b9630e02')}
            {recs.length})
          </h2>
          {recs.length > 0 && (
            <div className="v10-pill-row">
              <a className="v10-pill-btn" href={csvHref} download="registros-field-farms.csv">
                <Download size={16} aria-hidden="true" />
                {message('m2f7cd80aedf2')}
              </a>
              {hasDemoRecs && (
                <button type="button" className="v10-pill-btn" onClick={clearDemoRecords}>
                  <Trash2 size={16} aria-hidden="true" />
                  {message('m250ccbc4892f')}
                </button>
              )}
            </div>
          )}
        </div>

        {recs.length === 0 ? (
          <p className="v10-muted">{message('m5a036601276d')}</p>
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
            <h2 id="fluc-title">
              {message('m5b5899042c6e')}
              {fluc.region}
            </h2>
            <p className="v10-muted">
              {fluc.nReg}
              {message('ma9ceee36dda7')}
              {fluc.nAsadas}
              {message('m70106e886a76')}
            </p>
          </div>
          <button
            type="button"
            className="v10-pill-btn"
            aria-pressed={flucShare}
            onClick={() => setFlucShare(!flucShare)}
          >
            {flucShare ? message('m660adaa559e4') : message('mdb8c46ca57a9')}
          </button>
        </div>

        <ul className="v10-list">
          {fluc.list.map((org) => (
            <li key={org.name} className="v10-list-item">
              <div className="v10-map-toolbar">
                <strong>{org.name}</strong>
                <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
                  <span aria-hidden="true" style={{ color: org.col }}>
                    ●
                  </span>{' '}
                  {org.kind}
                </span>
              </div>
              <span className="v10-small">
                {org.meta}
                {org.national ? message('md49a6242839a') : ''}
                {org.hasStatus ? message('m0c74f86b9027', org.status) : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
