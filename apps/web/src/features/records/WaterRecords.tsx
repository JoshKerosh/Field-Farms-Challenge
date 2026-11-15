import { useState, type FormEvent } from 'react';
import { useField } from '../../app/context/FieldContext';
import { nearbySources } from '../../data/engine/watershed';
import { EVENT_TYPES, recordsCsv, recordTitle, type FieldRecord } from '../../data/engine/records';
import { PageLink } from '../../shared/ui';
import { useRecordsCopy } from './records-copy';
import { localDate, number } from '../restoration/recovery-format';

export function WaterRecords() {
  const c = useRecordsCopy();
  const { ds, ctx, farmSite, recs, addRecord, role, setRole } = useField();
  const [source, setSource] = useState('');
  const [type, setType] = useState<'caudal' | 'lluvia' | 'evento'>('caudal');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(false);
  if (!farmSite || !ds || !ctx)
    return (
      <section className="v10-card content-card">
        <p>{c.location}</p>
        <PageLink to="/farm">{c.source}</PageLink>
      </section>
    );
  const sources = nearbySources(ds, ctx);
  const selected = sources.find((s) => String(s.i) === source);
  const archive = recs.filter(
    (r) => r.demo || r.t === 'accion' || (r.t === 'lluvia' && !r.location),
  );
  const visible = recs.filter(
    (r) =>
      !r.demo &&
      r.t !== 'accion' &&
      (r.t === 'lluvia'
        ? r.location?.lat === farmSite.lat && r.location.lng === farmSite.lng
        : selected && r.src === selected.i),
  );
  const csv = `data:text/csv;charset=utf-8,${encodeURIComponent(recordsCsv(ds, visible))}`;
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form),
      date = String(d.get('date'));
    const litres = Number(d.get('litres')),
      seconds = Number(d.get('seconds'));
    const value =
      type === 'caudal'
        ? litres / seconds
        : type === 'lluvia'
          ? Number(d.get('rain'))
          : String(d.get('event'));
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date > localDate() ||
      (type !== 'lluvia' && !selected) ||
      (type === 'caudal' &&
        (!Number.isFinite(litres) || litres <= 0 || !Number.isFinite(seconds) || seconds <= 0)) ||
      (typeof value === 'number' && (!Number.isFinite(value) || value < 0))
    ) {
      setError(true);
      setFeedback(c.error);
      return;
    }
    const record: Omit<FieldRecord, 'id'> = {
      t: type,
      v: value,
      d: date,
      src: type === 'lluvia' ? undefined : selected!.i,
      note: String(d.get('note')).trim(),
      share: d.get('share') === 'on',
      location: { lat: farmSite!.lat, lng: farmSite!.lng },
    };
    const ok = addRecord(record);
    setError(!ok);
    setFeedback(ok ? c.saved : c.storageError);
    if (ok) form.reset();
  }
  return (
    <div className="v10-stack">
      <section className="v10-card content-card">
        <h2>{c.water}</h2>
        <p>{c.local}</p>
        <label>
          {c.source}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{c.chooseSource}</option>
            {sources.map((s) => (
              <option key={s.i} value={s.i}>
                {s.q[4]} · {number(s.d)} km
              </option>
            ))}
          </select>
        </label>
        <fieldset className="role-selector">
          <legend>{c.role}</legend>
          <div>
            {(
              [
                ['finquero', c.farmer],
                ['asada', c.asada],
                ['inst', c.institution],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                className="filter-button"
                aria-pressed={role === id}
                onClick={() => setRole(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {role !== 'finquero' && (
          <>
            <h3>{c.summary}</h3>
            <p>{c.summaryHelp}</p>
            <dl>
              <dt>{c.count}</dt>
              <dd>{visible.length}</dd>
              <dt>{c.sources}</dt>
              <dd>{selected && visible.some((r) => r.src === selected.i) ? 1 : 0}</dd>
            </dl>
          </>
        )}
      </section>
      <section className="v10-card content-card">
        <h2>{c.save}</h2>
        <label>
          {c.type}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as typeof type);
              setFeedback('');
            }}
          >
            <option value="caudal">{c.flow}</option>
            <option value="lluvia">{c.rainfall}</option>
            <option value="evento">{c.events}</option>
          </select>
        </label>
        <p>{type === 'caudal' ? c.flowHelp : type === 'lluvia' ? c.rainHelp : c.local}</p>
        <form key={type} onSubmit={save}>
          <fieldset className="recovery-fields">
            <label>
              {c.date}
              <input
                name="date"
                type="date"
                defaultValue={localDate()}
                max={localDate()}
                required
              />
            </label>
            {type === 'caudal' && (
              <>
                <label>
                  {c.litres}
                  <input name="litres" type="number" min="0.01" step="any" required />
                </label>
                <label>
                  {c.seconds}
                  <input name="seconds" type="number" min="0.01" step="any" required />
                </label>
              </>
            )}
            {type === 'lluvia' && (
              <label>
                {c.rain}
                <input name="rain" type="number" min="0" step="any" required />
              </label>
            )}
            {type === 'evento' && (
              <label>
                {c.event}
                <select name="event" required>
                  <option value="">{c.event}</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {c.note}
              <textarea name="note" maxLength={2000} />
            </label>
            <label className="record-share">
              <input name="share" type="checkbox" />
              {c.share}
            </label>
            <button type="submit">{c.save}</button>
          </fieldset>
        </form>
        {feedback && <p role={error ? 'alert' : 'status'}>{feedback}</p>}
      </section>
      <section className="v10-card content-card">
        <h2>{c.history}</h2>
        {!visible.length ? (
          <p>{c.empty}</p>
        ) : (
          <>
            <a className="v10-pill-btn" href={csv} download="registros-sow-water.csv">
              {c.export}
            </a>
            <ul className="v10-list">
              {visible.map((r) => (
                <li className="v10-list-item" key={r.id}>
                  <strong>{recordTitle(ds, r)}</strong>
                  <span>{r.d}</span>
                  {r.note && <p>{r.note}</p>}
                </li>
              ))}
            </ul>
            <h3>{c.trend}</h3>
            <p>{c.trendHelp}</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{c.date}</th>
                    <th>{c.flow}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible
                    .filter((r) => r.t === 'caudal')
                    .sort((a, b) => a.d.localeCompare(b.d))
                    .map((r) => (
                      <tr key={r.id}>
                        <td>{r.d}</td>
                        <td>{number(Number(r.v))} L/s</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {!!archive.length && (
        <details className="v10-card content-card">
          <summary>{c.archive}</summary>
          <p>{c.archiveHelp}</p>
          <ul>
            {archive.map((r) => (
              <li key={r.id}>
                {recordTitle(ds, r)} · {r.d}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
