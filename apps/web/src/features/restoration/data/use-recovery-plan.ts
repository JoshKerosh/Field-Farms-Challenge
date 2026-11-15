import { useEffect, useRef, useState } from 'react';
import type { RecoveryPlan } from '@field-farms/domain';
import { loadRecoveryPlan, saveRecoveryPlan } from './recovery-store';
import { useRecoveryCopy } from '../recovery-copy';

/** All views use the same existing per-farm IndexedDB record and backup format. */
export function useRecoveryPlan(id: string | null) {
  const c = useRecoveryCopy();
  const current = useRef(id);
  current.current = id;
  const [state, setState] = useState<{ id: string | null; plan: RecoveryPlan | null }>({
    id: null,
    plan: null,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [readingFailed, setReadingFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setError('');
    setSaved(false);
    setBusy(false);
    setReadingFailed(false);
    if (!id) {
      setState({ id, plan: null });
      return;
    }
    loadRecoveryPlan(id)
      .then((plan) => {
        if (active) setState({ id, plan });
      })
      .catch(() => {
        if (active) {
          setError(c.error);
          setReadingFailed(true);
          setState({ id, plan: null });
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function commit(next: RecoveryPlan) {
    if (!id || next.farmId !== id || busy || current.current !== id || readingFailed) return false;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await saveRecoveryPlan(next);
      if (current.current === id) {
        setState({ id, plan: next });
        setSaved(true);
      }
      return true;
    } catch {
      if (current.current === id) setError(c.error);
      return false;
    } finally {
      if (current.current === id) setBusy(false);
    }
  }
  return {
    plan: state.id === id ? state.plan : null,
    ready: state.id === id,
    busy,
    setBusy,
    saved,
    error,
    readingFailed,
    commit,
  };
}
