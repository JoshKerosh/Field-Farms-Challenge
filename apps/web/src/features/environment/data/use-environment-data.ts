import { useEffect, useState } from 'react';
import type { Fuente } from '@field-farms/domain';
import { cargarFuentes } from '../../../platform/data/data-files';
import {
  ENVIRONMENT_SOURCES,
  loadEnvironmentSource,
  type EnvironmentSource,
  type SourceResult,
} from './environment-data';

const loadingSources = (): Record<EnvironmentSource, SourceResult> => ({
  power: { status: 'loading' },
  modis: { status: 'loading' },
  roni: { status: 'loading' },
});

export function useEnvironmentData(enabled: boolean) {
  const [sources, setSources] = useState(loadingSources);
  const [catalog, setCatalog] = useState<Fuente[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setSources(loadingSources());
    setCatalog([]);
    for (const source of Object.keys(ENVIRONMENT_SOURCES) as EnvironmentSource[]) {
      void loadEnvironmentSource(source, attempt > 0).then(
        (file) => {
          if (!cancelled)
            setSources((previous) => ({ ...previous, [source]: { status: 'ready', file } }));
        },
        () => {
          if (!cancelled)
            setSources((previous) => ({ ...previous, [source]: { status: 'unavailable' } }));
        },
      );
    }
    void cargarFuentes(attempt > 0).then(
      (result) => {
        if (!cancelled && Array.isArray(result.fuentes)) setCatalog(result.fuentes);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);
  return { sources, catalog, retry: () => setAttempt((previous) => previous + 1) };
}
