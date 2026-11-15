import { RECOVERY_NEEDS, validRecoveryGoal, type RecoveryPlan } from '@field-farms/domain';
import { isLegacyExampleName } from '../../farms/farm-flow';
function validPlan(value: RecoveryPlan): boolean {
  try {
    return (
      value.version === 1 &&
      typeof value.farmId === 'string' &&
      typeof value.farmName === 'string' &&
      !!value.profile &&
      Number.isFinite(value.profile.hectares) &&
      !!value.needs &&
      RECOVERY_NEEDS.every((n) => ['yes', 'no', 'unknown'].includes(value.needs[n])) &&
      Array.isArray(value.goals) &&
      value.goals.every(
        (g) =>
          validRecoveryGoal(g) &&
          ['pending', 'active', 'completed', 'maintenance'].includes(g.status) &&
          Array.isArray(g.entries) &&
          g.entries.every(
            (e) =>
              Number.isFinite(e.quantity) &&
              e.quantity >= 0 &&
              Number.isFinite(e.expense) &&
              e.expense >= 0 &&
              typeof e.date === 'string' &&
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
