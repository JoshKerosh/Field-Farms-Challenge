import { useEffect, useState, type FormEvent } from 'react';
import {
  recoveryProgress,
  recoveryExpenses,
  type RecoveryGoal,
  type RecoveryEntry,
} from '@field-farms/domain';
import { recoveryPhoto } from '../data/recovery-store';
import { EntryCorrection } from './EntryCorrection';
import type { RecoveryCopy } from '../recovery-copy';
import { localDate, number, money } from '../recovery-format';
const today = localDate;
export function GoalRecords({
  goal,
  c,
  busy,
  onChange,
  onPreparing,
}: {
  onPreparing: (value: boolean) => void;
  goal: RecoveryGoal;
  c: RecoveryCopy;
  busy: boolean;
  onChange: (g: RecoveryGoal) => Promise<boolean>;
}) {
  const [error, setError] = useState(''),
    [preparing, setPreparing] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form),
      files = d.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
    setPreparing(true);
    onPreparing(true);
    setError('');
    try {
      if (files.length > 3) throw new Error('photos');
      const entry: RecoveryEntry = {
        id: crypto.randomUUID(),
        date: String(d.get('date')),
        quantity: Number(d.get('quantity')),
        note: String(d.get('note')),
        expense: Number(d.get('expense') || 0),
        photos: await Promise.all(files.map(recoveryPhoto)),
      };
      if (
        !Number.isFinite(entry.quantity) ||
        entry.quantity < 0 ||
        !Number.isFinite(entry.expense) ||
        entry.expense < 0 ||
        entry.date > today()
      )
        throw new Error('values');
      if (
        await onChange({
          ...goal,
          entries: [...goal.entries, entry],
          status: goal.status === 'pending' ? 'active' : goal.status,
        })
      )
        form.reset();
    } catch {
      setError(c.photoError);
    } finally {
      setPreparing(false);
      onPreparing(false);
    }
  }
  return (
    <article className="recovery-goal">
      <h3>{c.templates[goal.template][0]}</h3>
      <p>{c.templates[goal.template][1]}</p>
      <p>
        {goal.place} · {number(goal.target)} {c.units[goal.unit]} · {goal.due}
      </p>
      <p>
        {c.statusLabel}: {c.status[goal.status]}
      </p>
      <p>
        {c.progress}: {number(recoveryProgress(goal))} %
      </p>
      <progress value={recoveryProgress(goal)} max={100} aria-label={c.progress} />
      <p>
        {c.spent}: {money(recoveryExpenses(goal))}
      </p>
      <p>{c.maintenance}</p>
      {goal.entries.map((e) => (
        <section className="recovery-entry" key={e.id}>
          <p>
            {e.date} · {number(e.quantity)} {c.units[goal.unit]} · {money(e.expense)}
          </p>
          <p>{e.note}</p>
          <EntryCorrection
            entry={e}
            c={c}
            busy={busy}
            onSave={(next) =>
              onChange({
                ...goal,
                entries: goal.entries.map((old) => (old.id === next.id ? next : old)),
              })
            }
          />
          <div className="recovery-photos">
            {e.photos.map((p) => (
              <Photo key={p.id} data={p.data} alt={`${c.entry} ${e.date}`} />
            ))}
          </div>
        </section>
      ))}
      <details className="recovery-no-print">
        <summary>{c.entry}</summary>
        <form onSubmit={submit}>
          <fieldset disabled={busy || preparing} className="recovery-fields">
            <label>
              {c.date}
              <input name="date" type="date" required defaultValue={today()} max={today()} />
            </label>
            <label>
              {c.quantity}
              <input name="quantity" type="number" min="0" step="any" required />
            </label>
            <label>
              {c.expense}
              <input name="expense" type="number" min="0" step="any" />
            </label>
            <label>
              {c.note}
              <textarea name="note" maxLength={2000} />
            </label>
            <label>
              {c.photos}
              <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
            </label>
            <button type="submit">{preparing ? c.saving : c.save}</button>
          </fieldset>
        </form>
        {error && <p role="alert">{error}</p>}
      </details>
    </article>
  );
}
function Photo({ data, alt }: { data: ArrayBuffer; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [data]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={alt} loading="lazy" />
    </a>
  ) : null;
}
