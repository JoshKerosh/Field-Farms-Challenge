import { useState, type FormEvent } from 'react';
import type { RecoveryEntry } from '@field-farms/domain';
import type { RecoveryCopy } from '../recovery-copy';
export function EntryCorrection({
  entry,
  c,
  busy,
  onSave,
}: {
  entry: RecoveryEntry;
  c: RecoveryCopy;
  busy: boolean;
  onSave: (entry: RecoveryEntry) => Promise<boolean>;
}) {
  const [invalid, setInvalid] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      d = new FormData(form);
    const next = {
      ...entry,
      date: String(d.get('date')),
      quantity: Number(d.get('quantity')),
      expense: Number(d.get('expense')),
      note: String(d.get('note')),
    };
    const today = new Date();
    const last = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (
      !next.date ||
      next.date > last ||
      !Number.isFinite(next.quantity) ||
      next.quantity < 0 ||
      !Number.isFinite(next.expense) ||
      next.expense < 0
    ) {
      setInvalid(true);
      return;
    }
    if (await onSave(next)) {
      setInvalid(false);
      form.closest('details')?.removeAttribute('open');
    }
  }
  return (
    <details className="recovery-no-print">
      <summary>{c.editEntry}</summary>
      <form onSubmit={submit}>
        <fieldset className="recovery-fields" disabled={busy}>
          <label>
            {c.date}
            <input type="date" name="date" required defaultValue={entry.date} />
          </label>
          <label>
            {c.quantity}
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              required
              defaultValue={entry.quantity}
            />
          </label>
          <label>
            {c.expense}
            <input
              name="expense"
              type="number"
              min="0"
              step="any"
              required
              defaultValue={entry.expense}
            />
          </label>
          <label>
            {c.note}
            <textarea name="note" maxLength={2000} defaultValue={entry.note} />
          </label>
          <button type="submit">{c.saveChanges}</button>
          <button
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.form;
              form?.reset();
              form?.closest('details')?.removeAttribute('open');
              setInvalid(false);
            }}
          >
            {c.cancel}
          </button>
        </fieldset>
      </form>
      {invalid && <p role="alert">{c.valueError}</p>}
    </details>
  );
}
