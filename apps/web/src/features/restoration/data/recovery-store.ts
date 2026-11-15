import { RECOVERY_NEEDS, validRecoveryGoal, type RecoveryPlan } from '@field-farms/domain';
import { isLegacyExampleName } from '../../farms/farm-flow';
export function validPlan(value: RecoveryPlan): boolean {
  try {
    return (
      value.version === 1 &&
      typeof value.farmId === 'string' &&
      value.farmId.length > 0 &&
      typeof value.farmName === 'string' &&
      !!value.profile &&
      Number.isFinite(value.profile.hectares) &&
      value.profile.hectares > 0 &&
      Number.isFinite(value.profile.animals) &&
      value.profile.animals >= 0 &&
      typeof value.profile.activity === 'string' &&
      typeof value.profile.water === 'string' &&
      !!value.needs &&
      RECOVERY_NEEDS.every((n) => ['yes', 'no', 'unknown'].includes(value.needs[n])) &&
      Array.isArray(value.goals) &&
      new Set(value.goals.map((g) => g.id)).size === value.goals.length &&
      value.goals.every(
        (g) =>
          validRecoveryGoal(g) &&
          typeof g.id === 'string' &&
          g.id.length > 0 &&
          typeof g.place === 'string' &&
          ['pending', 'active', 'completed', 'maintenance'].includes(g.status) &&
          Array.isArray(g.entries) &&
          new Set(g.entries.map((e) => e.id)).size === g.entries.length &&
          g.entries.every(
            (e) =>
              Number.isFinite(e.quantity) &&
              e.quantity >= 0 &&
              Number.isFinite(e.expense) &&
              e.expense >= 0 &&
              typeof e.id === 'string' &&
              e.id.length > 0 &&
              typeof e.note === 'string' &&
              typeof e.date === 'string' &&
              /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
              Number.isFinite(Date.parse(e.date)) &&
              new Date(e.date).toISOString().slice(0, 10) === e.date &&
              Array.isArray(e.photos) &&
              e.photos.length <= 3 &&
              e.photos.every((p) => p.data instanceof ArrayBuffer),
          ),
      )
    );
  } catch {
    return false;
  }
}
const STORE = 'plans';
let pending: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  pending ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('ffc-recovery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'farmId' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        pending = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      pending = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      pending = undefined;
      reject(new Error('IndexedDB blocked'));
    };
  });
  return pending;
}
export async function loadRecoveryPlan(id: string): Promise<RecoveryPlan | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => {
      const value = request.result;
      if (value && (value.farmId !== id || !validPlan(value)))
        reject(new Error('Invalid recovery plan'));
      else
        resolve(
          value && (value.origin === 'manual' || !isLegacyExampleName(value.farmName))
            ? value
            : null,
        );
    };
    request.onerror = () => reject(request.error);
  });
}
export async function saveRecoveryPlan(plan: RecoveryPlan): Promise<void> {
  if (!validPlan(plan)) throw new Error('Invalid recovery plan');
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(plan);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
/** Delete only these identities. The returned callback restores them if profile removal fails. */
export async function deleteRecoveryPlans(ids: string[]): Promise<() => Promise<void>> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const backup: unknown[] = [];
    for (const id of new Set(ids)) {
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => {
        if (request.result !== undefined) backup.push(request.result);
      };
      tx.objectStore(STORE).delete(id);
    }
    tx.oncomplete = () =>
      resolve(
        () =>
          new Promise<void>((restored, failed) => {
            const restore = db.transaction(STORE, 'readwrite');
            for (const record of backup) restore.objectStore(STORE).put(record);
            restore.oncomplete = () => restored();
            restore.onerror = () => failed(restore.error);
            restore.onabort = () => failed(restore.error);
          }),
      );
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function recoveryPhoto(file: File): Promise<{ id: string; data: ArrayBuffer }> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error('Unsupported image');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image conversion failed'))),
        'image/jpeg',
        0.8,
      ),
    );
    return { id: crypto.randomUUID(), data: await blob.arrayBuffer() };
  } finally {
    bitmap.close();
  }
}
