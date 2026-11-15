import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { environmentalAlerts, type AlertsSummary } from '../../data/engine/alerts';
import {
  emptyAlertSources,
  loadAlertSources,
  type AlertSources,
} from '../../features/alerts/data/alert-sources';
import { imergEvidenceForPoint } from '../../features/alerts/data/imerg-source';
import {
  climateSignals,
  prepare,
  satelliteView,
  type DemoScenario,
} from '../../data/engine/climate';
import {
  activeFarm,
  myFarmToForm,
  pastureRotation,
  siteFloods,
  validateFarmForm,
  type ActionStatus,
  type FarmFormInput,
  type FarmKey,
  type FarmProfile,
  type MyFarm,
  type Rotation,
} from '../../data/engine/farm';
import { flucForCanton, type FlucSummary } from '../../data/engine/fluc';
import { getGeo, placeAt, type Loc, type PlaceContext } from '../../data/engine/geo';
import { demoRecords, type FieldRecord, type ViewRole } from '../../data/engine/records';
import {
  basinInfo,
  legalZone,
  waterJourney,
  watershedPlan,
  zoneFromAbove,
  type WaterJourney,
  type WatershedPlan,
} from '../../data/engine/watershed';
import { loadDataset } from '../../data/real/load';
import type { Dataset } from '../../data/real/types';
import { message, messageLanguage, useMessageLanguage } from '../../i18n/messages';
import type { ParcelFeature } from '../../platform/siri/parcel';
import { isLegacyExampleName } from '../../features/farms/farm-flow';
const LS_KEYS = {
  loc: 'ffc.v10.loc',
  farm: 'ffc.v10.farm',
  acts: 'ffc.acciones',
  recs: 'ffc.registros',
  role: 'ffc.v10.role',
  apartos: 'ffc.v10.apartos',
  flucShare: 'ffc.v10.flucShare',
  farmSite: 'ffc.v10.farmSite',
} as const;
/** Point chosen on the real map in "Mi finca" and the SIRI parcel under it, if any. */
export interface FarmSite {
  provisionalId?: string;
  lng: number;
  lat: number;
  accuracyM: number | null;
  parcel: ParcelFeature | null;
}
interface StoredLocation {
  x: number;
  y: number;
  subId: number | null;
  approx?: boolean;
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento lleno o restringido
  }
}
export interface FieldContextValue {
  ds: Dataset | null;
  loading: boolean;
  error: string | null;
  ctx: PlaceContext | null;
  approx: boolean;
  demo: DemoScenario | null;
  pickLocation: (
    loc: Loc,
    opts?: {
      subId?: number | null;
      approx?: boolean;
    },
  ) => boolean;
  pickLatLon: (lat: number, lon: number, approx?: boolean) => boolean;
  farmSite: FarmSite | null;
  /** Sets the farm chosen on the real map; it also becomes the app's location. */
  setFarmSite: (site: FarmSite) => void;
  /** Shows another sub-basin for the same location, keeping the farm (one on a divide). */
  setSubbasin: (subId: number) => void;
  farmKey: FarmKey;
  setFarmKey: (k: FarmKey) => void;
  myFarm: MyFarm | null;
  resetMyFarm: () => void;
  farm: FarmProfile | null;
  saveMyFarm: (input: FarmFormInput) =>
    | {
        ok: true;
      }
    | {
        ok: false;
        errors: ReturnType<typeof validateFarmForm>['errors'];
      };
  siteFloodsFlag: boolean;
  acts: Record<string, ActionStatus>;
  setActionStatus: (id: string, status: ActionStatus) => void;
  apartos: number;
  setApartos: (n: number) => void;
  recs: FieldRecord[];
  addRecord: (rec: Omit<FieldRecord, 'id'>) => boolean;
  loadDemoRecords: (srcIndex: number) => void;
  clearDemoRecords: () => void;
  role: ViewRole;
  setRole: (r: ViewRole) => void;
  flucShare: boolean;
  setFlucShare: (v: boolean) => void;
  journey: WaterJourney | null;
  legal: ReturnType<typeof legalZone> | null;
  basin: ReturnType<typeof basinInfo> | null;
  plan: WatershedPlan | null;
  zoneAbove: ReturnType<typeof zoneFromAbove> | null;
  clima: ReturnType<typeof climateSignals> | null;
  prep: ReturnType<typeof prepare> | null;
  satFrame: number | null;
  setSatFrame: (idx: number | null) => void;
  satView: ReturnType<typeof satelliteView> | null;
  rotation: Rotation | null;
  alerts: AlertsSummary | null;
  alertSources: AlertSources;
  fluc: FlucSummary | null;
}
const FieldContext = createContext<FieldContextValue | null>(null);
export function FieldContextProvider({ children }: { children: ReactNode }) {
  useMessageLanguage();
  const [ds, setDs] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storedLoc, setStoredLoc] = useState<StoredLocation | null>(() =>
    readJson<StoredLocation | null>(LS_KEYS.loc, null),
  );
  const [farmState, setFarmState] = useState<{
    key: FarmKey;
    my: MyFarm | null;
  }>(() => {
    const saved = readJson<{
      key?: FarmKey;
      my?: MyFarm | null;
      version?: number;
    } | null>(LS_KEYS.farm, null);
    if (saved?.my && (saved.version === 2 || !isLegacyExampleName(saved.my.name)))
      return { key: 'mia', my: saved.my };
    return { key: 'mia', my: null };
  });
  const [acts, setActs] = useState<Record<string, ActionStatus>>(() =>
    readJson<Record<string, ActionStatus>>(LS_KEYS.acts, {}),
  );
  const [recs, setRecs] = useState<FieldRecord[]>(() => readJson<FieldRecord[]>(LS_KEYS.recs, []));
  const [role, setRoleState] = useState<ViewRole>(() =>
    readJson<ViewRole>(LS_KEYS.role, 'finquero'),
  );
  const [apartos, setApartosState] = useState<number>(() => readJson<number>(LS_KEYS.apartos, 8));
  const [flucShare, setFlucShareState] = useState<boolean>(() =>
    readJson<boolean>(LS_KEYS.flucShare, false),
  );
  const [farmSite, setFarmSiteState] = useState<FarmSite | null>(() =>
    readJson<{ version?: number } | null>(LS_KEYS.farm, null)?.version !== 2 &&
    isLegacyExampleName(readJson<{ my?: MyFarm } | null>(LS_KEYS.farm, null)?.my?.name ?? '')
      ? null
      : readJson<FarmSite | null>(LS_KEYS.farmSite, null),
  );
  const demo: DemoScenario | null = null;
  const [alertSources, setAlertSources] = useState<AlertSources>(emptyAlertSources);
  const [spatialAlertEvidence, setSpatialAlertEvidence] = useState<AlertSources['spatial']>(null);
  useEffect(() => {
    let alive = true;
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Restricted storage. */
    }
    void loadAlertSources(fetch, storage).then((sources) => {
      if (alive) setAlertSources(sources);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [satFrame, setSatFrame] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    loadDataset()
      .then((loaded) => {
        if (!alive) return;
        setDs(loaded);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : message('m2400afc92eba'));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const ctx = useMemo<PlaceContext | null>(() => {
    if (!ds) return null;
    // The active farm is authoritative, including when an older contextual location was saved.
    if (farmSite) {
      const loc = getGeo(ds).llToLocal(farmSite.lat, farmSite.lng);
      const samePoint =
        storedLoc && Math.abs(storedLoc.x - loc.x) < 1e-6 && Math.abs(storedLoc.y - loc.y) < 1e-6;
      const resolved = placeAt(ds, loc, samePoint ? storedLoc.subId : null);
      if (resolved) return resolved;
    }
    if (storedLoc) {
      const resolved = placeAt(ds, { x: storedLoc.x, y: storedLoc.y }, storedLoc.subId);
      if (resolved) return resolved;
    }
    const geo = getGeo(ds);
    const upalaLoc = geo.llToLocal(10.8, -85.08);
    return placeAt(ds, upalaLoc, null);
  }, [ds, storedLoc, farmSite, messageLanguage()]);
  useEffect(() => {
    if (!ds || !ctx) return;
    let alive = true;
    const [longitude, latitude] = getGeo(ds).localToLngLat(ctx.loc);
    void imergEvidenceForPoint(alertSources.imerg, longitude, latitude).then((evidence) => {
      if (alive) setSpatialAlertEvidence({ longitude, latitude, evidence });
    });
    return () => {
      alive = false;
    };
  }, [ds, ctx, alertSources.imerg]);
  const applyLocation = useCallback(
    (
      loc: Loc,
      opts?: {
        subId?: number | null;
        approx?: boolean;
      },
    ) => {
      if (!ds) return false;
      const nextSubId = opts?.subId === undefined ? null : opts.subId;
      const resolved = placeAt(ds, loc, nextSubId);
      if (!resolved) return false;
      const next: StoredLocation = {
        x: resolved.loc.x,
        y: resolved.loc.y,
        subId: resolved.subId,
        approx: Boolean(opts?.approx),
      };
      setStoredLoc(next);
      writeJson(LS_KEYS.loc, next);
      return true;
    },
    [ds, messageLanguage()],
  );
  // Any other way of choosing a place leaves the farm from the real map behind.
  const pickLocation = useCallback(
    (
      loc: Loc,
      opts?: {
        subId?: number | null;
        approx?: boolean;
      },
    ) => {
      const ok = applyLocation(loc, opts);
      if (ok) {
        setFarmSiteState(null);
        writeJson(LS_KEYS.farmSite, null);
      }
      return ok;
    },
    [applyLocation, messageLanguage()],
  );
  const pickLatLon = useCallback(
    (lat: number, lon: number, approx = false) => {
      if (!ds) return false;
      const loc = getGeo(ds).llToLocal(lat, lon);
      return pickLocation(loc, { approx });
    },
    [ds, pickLocation, messageLanguage()],
  );
  const setFarmSite = useCallback(
    (site: FarmSite) => {
      if (ds) applyLocation(getGeo(ds).llToLocal(site.lat, site.lng));
      const draftId = `draft:${crypto.randomUUID()}`;
      setFarmSiteState((previous) => {
        const provisionalId =
          previous?.provisionalId ??
          (previous ? `point:${previous.lat.toFixed(5)},${previous.lng.toFixed(5)}` : draftId);
        const next = { ...site, provisionalId };
        writeJson(LS_KEYS.farmSite, next);
        return next;
      });
    },
    [ds, applyLocation, messageLanguage()],
  );
  const setFarmKey = useCallback(
    (key: FarmKey) => {
      setFarmState((prev) => {
        const next = { key, my: prev.my };
        writeJson(LS_KEYS.farm, next);
        return next;
      });
    },
    [messageLanguage()],
  );
  const saveMyFarm = useCallback(
    (input: FarmFormInput) => {
      const check = validateFarmForm(input);
      if (!check.ok || !check.farm) {
        return { ok: false as const, errors: check.errors };
      }
      const next = { version: 2, key: 'mia' as const, my: check.farm };
      setFarmState(next);
      writeJson(LS_KEYS.farm, next);
      return { ok: true as const };
    },
    [messageLanguage()],
  );
  const setActionStatus = useCallback(
    (id: string, status: ActionStatus) => {
      setActs((prev) => {
        const next = { ...prev, [id]: prev[id] === status ? '' : status };
        writeJson(LS_KEYS.acts, next);
        return next;
      });
    },
    [messageLanguage()],
  );
  const setApartos = useCallback(
    (n: number) => {
      const clamped = Math.max(2, Math.min(40, Math.round(n) || 8));
      setApartosState(clamped);
      writeJson(LS_KEYS.apartos, clamped);
    },
    [messageLanguage()],
  );
  const addRecord = useCallback(
    (rec: Omit<FieldRecord, 'id'>) => {
      const next = [{ ...rec, id: crypto.randomUUID() }, ...recs];
      try {
        window.localStorage.setItem(LS_KEYS.recs, JSON.stringify(next));
      } catch {
        return false;
      }
      setRecs(next);
      return true;
    },
    [recs],
  );
  const loadDemoRecords = useCallback(
    (srcIndex: number) => {
      setRecs((prev) => {
        const fresh = demoRecords(srcIndex);
        const next = [...fresh, ...prev.filter((r) => !r.demo)];
        writeJson(LS_KEYS.recs, next);
        return next;
      });
    },
    [messageLanguage()],
  );
  const clearDemoRecords = useCallback(() => {
    setRecs((prev) => {
      const next = prev.filter((r) => !r.demo);
      writeJson(LS_KEYS.recs, next);
      return next;
    });
  }, [messageLanguage()]);
  const setRole = useCallback(
    (r: ViewRole) => {
      setRoleState(r);
      writeJson(LS_KEYS.role, r);
    },
    [messageLanguage()],
  );
  const setFlucShare = useCallback(
    (v: boolean) => {
      setFlucShareState(v);
      writeJson(LS_KEYS.flucShare, v);
    },
    [messageLanguage()],
  );
  const setSubbasin = useCallback(
    (subId: number) => {
      if (ctx) applyLocation(ctx.loc, { subId, approx: Boolean(storedLoc?.approx) });
    },
    [ctx, storedLoc, applyLocation],
  );
  const farm = useMemo(
    () => (ctx && farmState.my ? activeFarm('mia', farmState.my) : null),
    [ctx, farmState.key, farmState.my, messageLanguage()],
  );
  const siteFloodsFlag = useMemo(
    () => (ctx ? siteFloods(ctx, demo, farmState.key, farmState.my) : false),
    [ctx, demo, farmState.key, farmState.my, messageLanguage()],
  );
  const journey = useMemo(
    () => (ds && ctx ? waterJourney(ds, ctx) : null),
    [ds, ctx, messageLanguage()],
  );
  const legal = useMemo(
    () => (ds && ctx ? legalZone(ds, ctx) : null),
    [ds, ctx, messageLanguage()],
  );
  const basin = useMemo(
    () => (ds && ctx ? basinInfo(ds, ctx) : null),
    [ds, ctx, messageLanguage()],
  );
  const plan = useMemo(
    () => (ds && ctx ? watershedPlan(ds, ctx, demo) : null),
    [ds, ctx, demo, messageLanguage()],
  );
  const zoneAbove = useMemo(
    () => (ds && ctx ? zoneFromAbove(ds, ctx.loc) : null),
    [ds, ctx, messageLanguage()],
  );
  const clima = useMemo(
    () => (ds && ctx ? climateSignals(ds, ctx, demo) : null),
    [ds, ctx, demo, messageLanguage()],
  );
  const prep = useMemo(
    () => (ds && ctx ? prepare(ds, ctx, demo) : null),
    [ds, ctx, demo, messageLanguage()],
  );
  const satView = useMemo(
    () => (ds && ctx ? satelliteView(ds, ctx, demo, satFrame) : null),
    [ds, ctx, demo, satFrame, messageLanguage()],
  );
  const rotation = useMemo(() => {
    if (!ds || !ctx || !farm || !satView) return null;
    const vNow = satView.serie[satView.serie.length - 1] ?? 0.65;
    return pastureRotation(ds, ctx, demo, farm, apartos, vNow);
  }, [ds, ctx, demo, farm, apartos, satView, messageLanguage()]);
  const alerts = useMemo(() => {
    if (!ds || !ctx) return null;
    return environmentalAlerts(ds, ctx, demo, undefined, {
      ...alertSources,
      spatial: spatialAlertEvidence,
    });
  }, [ds, ctx, demo, alertSources, spatialAlertEvidence, messageLanguage()]);
  const fluc = useMemo(
    () => (ds && ctx ? flucForCanton(ds, ctx.canton.n) : null),
    [ds, ctx, messageLanguage()],
  );
  const value: FieldContextValue = {
    ds,
    loading,
    error,
    ctx,
    approx: Boolean(storedLoc?.approx),
    demo,
    pickLocation,
    pickLatLon,
    farmSite,
    setFarmSite,
    setSubbasin,
    farmKey: farmState.key,
    setFarmKey,
    myFarm: farmState.my,
    resetMyFarm: () => {
      // Removal must succeed before the UI reports that the farm was cleared.
      const previous = [LS_KEYS.farm, LS_KEYS.farmSite, LS_KEYS.loc].map(
        (key) => [key, window.localStorage.getItem(key)] as const,
      );
      try {
        for (const [key] of previous) window.localStorage.removeItem(key);
      } catch (error) {
        for (const [key, value] of previous) {
          try {
            if (value !== null) window.localStorage.setItem(key, value);
          } catch {
            /* Preserve the original storage error. */
          }
        }
        throw error;
      }
      setFarmState({ key: 'mia', my: null });
      setFarmSiteState(null);
      setStoredLoc(null);
    },
    farm,
    saveMyFarm,
    siteFloodsFlag,
    acts,
    setActionStatus,
    apartos,
    setApartos,
    recs,
    addRecord,
    loadDemoRecords,
    clearDemoRecords,
    role,
    setRole,
    flucShare,
    setFlucShare,
    journey,
    legal,
    basin,
    plan,
    zoneAbove,
    clima,
    prep,
    satFrame,
    setSatFrame,
    satView,
    rotation,
    alerts,
    alertSources,
    fluc,
  };
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
export function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error(message('m2367bc02bfcf'));
  return ctx;
}
export { myFarmToForm };
