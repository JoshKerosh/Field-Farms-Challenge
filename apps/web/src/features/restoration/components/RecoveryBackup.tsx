import { useState } from 'react';
import type { RecoveryPlan } from '@field-farms/domain';
import { encodeRecoveryBackup, decodeRecoveryBackup } from '../data/recovery-backup';
import type { RecoveryCopy } from '../recovery-copy';
export function RecoveryBackup({
  plan,
  id,
  name,
  busy,
  c,
  onRestore,
}: {
  plan: RecoveryPlan | null;
  id: string;
  name: string;
  busy: boolean;
  c: RecoveryCopy;
  onRestore: (plan: RecoveryPlan) => Promise<boolean>;
}) {
  const [error, setError] = useState(false),
    [working, setWorking] = useState(false);
  return (
    <section className="v10-card recovery-no-print">
      <h2>{c.backups}</h2>
      <p>{c.backupHelp}</p>
      {plan && (
        <button
          type="button"
          disabled={busy || working}
          onClick={() => {
            const blob = new Blob([encodeRecoveryBackup(plan)], { type: 'application/json' }),
              url = URL.createObjectURL(blob),
              a = document.createElement('a');
            a.href = url;
            a.download = 'sow-water-recovery.json';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          {c.downloadBackup}
        </button>
      )}
      <label>
        {c.restoreBackup}
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy || working}
          onChange={async (e) => {
            const input = e.currentTarget,
              file = input.files?.[0];
            if (!file) return;
            setError(false);
            setWorking(true);
            try {
              if (file.size > 50 * 1024 * 1024) throw new Error('Backup too large');
              const restored = decodeRecoveryBackup(await file.text(), id);
              if (window.confirm(`${c.restoreConfirm}\n${restored.farmName} → ${name}`))
                await onRestore({ ...restored, farmId: id, origin: 'manual' });
            } catch {
              setError(true);
            } finally {
              input.value = '';
              setWorking(false);
            }
          }}
        />
      </label>
      {error && <p role="alert">{c.backupError}</p>}
    </section>
  );
}
