import type { RecoveryPlan } from '@field-farms/domain';
import { validPlan } from './recovery-store';
export function encodeRecoveryBackup(plan: RecoveryPlan): string {
  return JSON.stringify({ format: 'ffc-recovery-backup', version: 1, plan }, (_key, value) => {
    if (!(value instanceof ArrayBuffer)) return value;
    const bytes = new Uint8Array(value);
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192)
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { encoding: 'base64', data: btoa(text) };
  });
}
export function decodeRecoveryBackup(text: string, farmId: string): RecoveryPlan {
  const parsed = JSON.parse(text, (_key, value) => {
    if (value?.encoding === 'base64' && typeof value.data === 'string') {
      const binary = atob(value.data);
      return Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
    }
    return value;
  });
  if (
    parsed?.format !== 'ffc-recovery-backup' ||
    parsed.version !== 1 ||
    !validPlan(parsed.plan) ||
    (parsed.plan.farmId.startsWith('siri-') &&
      farmId.startsWith('siri-') &&
      parsed.plan.farmId !== farmId)
  )
    throw new Error('Invalid backup or another farm');
  return parsed.plan;
}
