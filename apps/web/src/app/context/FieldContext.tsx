import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  climateSignals,
  prepare,
  satelliteView,
  type DemoScenario,
} from '../../data/engine/climate';
import { elNinoAlerts, type AlertsSummary } from '../../data/engine/alerts';
import { answerQuestion, type QuestionId } from '../../data/engine/assistant';
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

const LS_KEYS = {
  loc: 'ffc.v10.loc',
  farm: 'ffc.v10.farm',
  acts: 'ffc.acciones',
  recs: 'ffc.registros',
  role: 'ffc.v10.role',
  apartos: 'ffc.v10.apartos',
  flucShare: 'ffc.v10.flucShare',
} as const;

export interface ChatTurn {
  id: QuestionId;
  question: string;
  answer: string;
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
  setDemo: (d: DemoScenario | null) => void;
  pickLocation: (loc: Loc, opts?: { subId?: number | null; approx?: boolean }) => boolean;
  pickLatLon: (lat: number, lon: number, approx?: boolean) => boolean;
  farmKey: FarmKey;
  setFarmKey: (k: FarmKey) => void;
  myFarm: MyFarm | null;
  farm: FarmProfile | null;
  saveMyFarm: (input: FarmFormInput) => { ok: true } | { ok: false; errors: ReturnType<typeof validateFarmForm>['errors'] };
  siteFloodsFlag: boolean;
  acts: Record<string, ActionStatus>;
  setActionStatus: (id: string, status: ActionStatus) => void;
  apartos: number;
  setApartos: (n: number) => void;
  recs: FieldRecord[];
  addRecord: (rec: Omit<FieldRecord, 'id'>) => void;
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
  fluc: FlucSummary | null;
  chatTurns: ChatTurn[];
  askAssistant: (id: QuestionId, questionText: string) => string;
  clearAssistant: () => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function FieldContextProvider({ children }: { children: ReactNode }) {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storedLoc, setStoredLoc] = useState<StoredLocation | null>(() =>
    readJson<StoredLocation | null>(LS_KEYS.loc, null),
  );
  const [farmState, setFarmState] = useState<{ key: FarmKey; my: MyFarm | null }>(() => {
    const saved = readJson<{ key?: FarmKey; my?: MyFarm | null } | null>(LS_KEYS.farm, null);
    if (saved && saved.my) return { key: saved.key || 'mia', my: saved.my };
    return { key: saved?.key || 'lechera', my: null };
  });
  const [acts, setActs] = useState<Record<string, ActionStatus>>(() =>
    readJson<Record<string, ActionStatus>>(LS_KEYS.acts, {}),
  );
  const [recs, setRecs] = useState<FieldRecord[]>(() =>
    readJson<FieldRecord[]>(LS_KEYS.recs, []),
  );
  const [role, setRoleState] = useState<ViewRole>(() =>
    readJson<ViewRole>(LS_KEYS.role, 'finquero'),
  );
  const [apartos, setApartosState] = useState<number>(() =>
    readJson<number>(LS_KEYS.apartos, 8),
  );
  const [flucShare, setFlucShareState] = useState<boolean>(() =>
    readJson<boolean>(LS_KEYS.flucShare, false),
  );
  const [demo, setDemo] = useState<DemoScenario | null>(null);
  const [satFrame, setSatFrame] = useState<number | null>(null);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);

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
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const ctx = useMemo<PlaceContext | null>(() => {
    if (!ds) return null;
    if (storedLoc) {
      const resolved = placeAt(ds, { x: storedLoc.x, y: storedLoc.y }, storedLoc.subId);
      if (resolved) return resolved;
    }
    const geo = getGeo(ds);
    const upalaLoc = geo.llToLocal(10.8, -85.08);
    return placeAt(ds, upalaLoc, null);
  }, [ds, storedLoc]);

  const pickLocation = useCallback(
    (loc: Loc, opts?: { subId?: number | null; approx?: boolean }) => {
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
    [ds],
  );

  const pickLatLon = useCallback(
    (lat: number, lon: number, approx = false) => {
      if (!ds) return false;
      const loc = getGeo(ds).llToLocal(lat, lon);
      return pickLocation(loc, { approx });
    },
    [ds, pickLocation],
  );

  const setFarmKey = useCallback((key: FarmKey) => {
    setFarmState((prev) => {
      const next = { key, my: prev.my };
      writeJson(LS_KEYS.farm, next);
      return next;
    });
  }, []);

  const saveMyFarm = useCallback(
    (input: FarmFormInput) => {
      const check = validateFarmForm(input);
      if (!check.ok || !check.farm) {
        return { ok: false as const, errors: check.errors };
      }
      const next = { key: 'mia' as const, my: check.farm };
      setFarmState(next);
      writeJson(LS_KEYS.farm, next);
      return { ok: true as const };
    },
    [],
  );

  const setActionStatus = useCallback((id: string, status: ActionStatus) => {
    setActs((prev) => {
      const next = { ...prev, [id]: prev[id] === status ? '' : status };
      writeJson(LS_KEYS.acts, next);
      return next;
    });
  }, []);

  const setApartos = useCallback((n: number) => {
    const clamped = Math.max(2, Math.min(40, Math.round(n) || 8));
    setApartosState(clamped);
    writeJson(LS_KEYS.apartos, clamped);
  }, []);

  const addRecord = useCallback((rec: Omit<FieldRecord, 'id'>) => {
    setRecs((prev) => {
      const created: FieldRecord = { ...rec, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
      const next = [created, ...prev];
      writeJson(LS_KEYS.recs, next);
      return next;
    });
  }, []);

  const loadDemoRecords = useCallback((srcIndex: number) => {
    setRecs((prev) => {
      const fresh = demoRecords(srcIndex);
      const next = [...fresh, ...prev.filter((r) => !r.demo)];
      writeJson(LS_KEYS.recs, next);
      return next;
    });
  }, []);

  const clearDemoRecords = useCallback(() => {
    setRecs((prev) => {
      const next = prev.filter((r) => !r.demo);
      writeJson(LS_KEYS.recs, next);
      return next;
    });
  }, []);

  const setRole = useCallback((r: ViewRole) => {
    setRoleState(r);
    writeJson(LS_KEYS.role, r);
  }, []);

  const setFlucShare = useCallback((v: boolean) => {
    setFlucShareState(v);
    writeJson(LS_KEYS.flucShare, v);
  }, []);

  const farm = useMemo(
    () => (ctx ? activeFarm(farmState.key, farmState.my) : null),
    [ctx, farmState.key, farmState.my],
  );

  const siteFloodsFlag = useMemo(
    () => (ctx ? siteFloods(ctx, demo, farmState.key, farmState.my) : false),
    [ctx, demo, farmState.key, farmState.my],
  );

  const journey = useMemo(() => (ds && ctx ? waterJourney(ds, ctx) : null), [ds, ctx]);
  const legal = useMemo(() => (ds && ctx ? legalZone(ds, ctx) : null), [ds, ctx]);
  const basin = useMemo(() => (ds && ctx ? basinInfo(ds, ctx) : null), [ds, ctx]);
  const plan = useMemo(() => (ds && ctx ? watershedPlan(ds, ctx, demo) : null), [ds, ctx, demo]);
  const zoneAbove = useMemo(() => (ds && ctx ? zoneFromAbove(ds, ctx.loc) : null), [ds, ctx]);
  const clima = useMemo(() => (ds && ctx ? climateSignals(ds, ctx, demo) : null), [ds, ctx, demo]);
  const prep = useMemo(() => (ds && ctx ? prepare(ds, ctx, demo) : null), [ds, ctx, demo]);
  const satView = useMemo(
    () => (ds && ctx ? satelliteView(ds, ctx, demo, satFrame) : null),
    [ds, ctx, demo, satFrame],
  );
  const rotation = useMemo(() => {
    if (!ds || !ctx || !farm || !satView) return null;
    const vNow = satView.serie[satView.serie.length - 1] ?? 0.65;
    return pastureRotation(ds, ctx, demo, farm, apartos, vNow);
  }, [ds, ctx, demo, farm, apartos, satView]);
  const alerts = useMemo(() => {
    if (!ds || !ctx || !rotation) return null;
    return elNinoAlerts(ds, ctx, demo, rotation, siteFloodsFlag);
  }, [ds, ctx, demo, rotation, siteFloodsFlag]);
  const fluc = useMemo(
    () => (ds && ctx ? flucForCanton(ds, ctx.canton.n) : null),
    [ds, ctx],
  );

  const askAssistant = useCallback(
    (id: QuestionId, questionText: string) => {
      if (!ds || !ctx || !journey || !alerts || !fluc || !plan || !zoneAbove) {
        return 'Todavía estamos cargando los datos del territorio.';
      }
      const answer = answerQuestion(id, {
        ds,
        ctx,
        siteFloodsFlag,
        journey,
        alerts,
        fluc,
        plan,
        zoneAbove,
      });
      setChatTurns((prev) => [...prev, { id, question: questionText, answer }]);
      return answer;
    },
    [ds, ctx, siteFloodsFlag, journey, alerts, fluc, plan, zoneAbove],
  );

  const clearAssistant = useCallback(() => setChatTurns([]), []);

  const value: FieldContextValue = {
    ds,
    loading,
    error,
    ctx,
    approx: Boolean(storedLoc?.approx),
    demo,
    setDemo,
    pickLocation,
    pickLatLon,
    farmKey: farmState.key,
    setFarmKey,
    myFarm: farmState.my,
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
    fluc,
    chatTurns,
    askAssistant,
    clearAssistant,
  };

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

export function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error('useField debe usarse dentro de FieldContextProvider.');
  return ctx;
}

export { myFarmToForm };
