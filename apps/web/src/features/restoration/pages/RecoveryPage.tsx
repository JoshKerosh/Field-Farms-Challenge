import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import {
  RECOVERY_NEEDS,
  RECOVERY_UNITS,
  recoveryFarmId,
  recoveryProgress,
  suggestedRecoveryNeeds,
  validRecoveryGoal,
  type RecoveryPlan,
  type RecoveryGoal,
  type RecoveryNeed,
  type RecoveryStatus,
} from '@field-farms/domain';
import { useField, type FarmSite } from '../../../app/context/FieldContext';
import { FARM_ACTIVITIES, FARM_WATER, type MyFarm } from '../../../data/engine/farm';
import { PageHeader, PageLink } from '../../../shared/ui';
import { loadRecoveryPlan } from '../data/recovery-store';
import { useRecoveryPlan } from '../data/use-recovery-plan';
import {
  recoveryEnvironment,
  type RecoveryEnvironment,
  type HistoryRow,
} from '../data/recovery-environment';
import { useRecoveryCopy, type RecoveryCopy } from '../recovery-copy';
import './recovery.css';
const technicalUrl = 'https://mag.go.cr/wpfd_file/buenas-practicas-en-ganaderia/';
const number = (n: number) =>
  new Intl.NumberFormat(document.documentElement.lang || 'es', { maximumFractionDigits: 2 }).format(
    n,
  );
export function RecoveryPage() {
  const c = useRecoveryCopy();
  const { farmSite, myFarm } = useField();
  return (
    <div className="v10-stack recovery">
      <PageHeader title={c.title} intro={c.intro} />
      {!farmSite || !myFarm ? (
        <section className="v10-card">
          <p>{c.locate}</p>
          <PageLink to="/farm">{c.farm}</PageLink>
        </section>
      ) : (
        <FarmRecovery key={recoveryFarmId(farmSite)} site={farmSite} profile={myFarm} />
      )}
    </div>
  );
}
function FarmRecovery({ site, profile }: { site: FarmSite; profile: MyFarm }) {
  const c = useRecoveryCopy(),
    id = recoveryFarmId(site);
  const { plan, ready, busy, saved, error, readingFailed, commit } = useRecoveryPlan(id);
  const [provisional, setProvisional] = useState<RecoveryPlan | null>(null),
    [environment, setEnvironment] = useState<RecoveryEnvironment | null>(null),
    [environmentReady, setEnvironmentReady] = useState(false),
    [selected, setSelected] = useState('');
  const [needs, setNeeds] = useState<RecoveryPlan['needs']>({
    water: 'unknown',
    soil: 'unknown',
    cattle: 'unknown',
    trees: 'unknown',
    shade: 'unknown',
    season: 'unknown',
  });
  useEffect(() => {
    let active = true;
    if (site.parcel)
      loadRecoveryPlan(recoveryFarmId({ ...site, parcel: null }))
        .then((p) => {
          if (active) setProvisional(p);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    let active = true;
    setEnvironment(null);
    setEnvironmentReady(false);
    setSelected('');
    recoveryEnvironment(site)
      .then((value) => {
        if (active) {
          setEnvironment(value);
          setSelected(value.basins[0]?.id ?? '');
          setEnvironmentReady(true);
        }
      })
      .catch(() => {
        if (active) setEnvironmentReady(true);
      });
    return () => {
      active = false;
    };
  }, [site.lat, site.lng, site.parcel]);
  useEffect(() => {
    if (plan) setNeeds(plan.needs);
  }, [plan]);
  function confirm(e: FormEvent) {
    e.preventDefault();
    void commit(
      plan
        ? { ...plan, needs }
        : {
            version: 1,
            origin: 'manual',
            farmId: id,
            farmName: profile.name || c.farm,
            profile: {
              activity: profile.act,
              hectares: profile.ha,
              animals: profile.animals,
              water: profile.agua,
            },
            confirmedAt: new Date().toISOString(),
            needs,
            goals: [],
          },
    );
  }
  if (!ready) return <p role="status">{c.loading}</p>;
  if (readingFailed) return <p role="alert">{c.error}</p>;
  const suggestions = suggestedRecoveryNeeds(plan?.needs ?? needs);
  return (
    <>
      <div className="recovery-feedback" aria-live="polite">
        {busy ? c.saving : saved ? c.saved : ''}
      </div>
      {error && <p role="alert">{error}</p>}
      <section className="v10-card recovery-priorities" aria-labelledby="recovery-priorities-title">
        <h2 id="recovery-priorities-title">{c.priorities}</h2>
        <div className="recovery-priorities-layout">
          <div className="recovery-farm-summary">
            <div className="recovery-farm-heading">
              <h3>{plan?.farmName || profile.name || c.farm}</h3>
              <p>{c.profile}</p>
            </div>
            <dl className="recovery-farm-facts">
              <div>
                <dt>{c.farmArea}</dt>
                <dd>{number(plan?.profile.hectares ?? profile.ha)} ha</dd>
              </div>
              <div>
                <dt>{c.farmAnimals}</dt>
                <dd>{number(plan?.profile.animals ?? profile.animals)}</dd>
              </div>
              <div>
                <dt>{c.farmActivity}</dt>
                <dd>
                  {
                    FARM_ACTIVITIES.find(
                      ([key]) => key === (plan?.profile.activity ?? profile.act),
                    )?.[1]
                  }
                </dd>
              </div>
              <div>
                <dt>{c.farmWater}</dt>
                <dd>
                  {FARM_WATER.find(([key]) => key === (plan?.profile.water ?? profile.agua))?.[1]}
                </dd>
              </div>
            </dl>
            <dl className="recovery-farm-location">
              <div>
                <dt>{c.parcel}</dt>
                <dd>{site.parcel ? site.parcel.properties.identifica : c.provisional}</dd>
              </div>
              <div>
                <dt>{c.basin}</dt>
                <dd>
                  {environment?.basins.length
                    ? environment.basins.map((b) => b.name).join(' · ')
                    : environmentReady
                      ? c.noBasin
                      : c.loadingLocation}
                </dd>
              </div>
              {environment?.subbasins.length ? (
                <div>
                  <dt>{c.subbasin}</dt>
                  <dd>{environment.subbasins.map((s) => s.name).join(' · ')}</dd>
                </div>
              ) : null}
            </dl>
            <details className="recovery-profile-help">
              <summary>{c.aboutProfile}</summary>
              <p>{c.profileHelp}</p>
            </details>
            {!plan && provisional && (
              <button disabled={busy} onClick={() => void commit({ ...provisional, farmId: id })}>
                {c.link}
              </button>
            )}
          </div>
          <form className="recovery-priorities-form" onSubmit={confirm}>
            <fieldset disabled={busy} aria-describedby="recovery-needs-help">
              <legend>{c.needsTitle}</legend>
              <p id="recovery-needs-help" className="recovery-needs-help">
                {c.needsHelp}
              </p>
              <div className="recovery-needs">
                {RECOVERY_NEEDS.map((n) => (
                  <label key={n}>
                    <span>{c.questions[n]}</span>
                    <select
                      value={needs[n]}
                      onChange={(e) =>
                        setNeeds({
                          ...needs,
                          [n]: e.target.value as RecoveryPlan['needs'][RecoveryNeed],
                        })
                      }
                    >
                      <option value="unknown">{c.unknown}</option>
                      <option value="yes">{c.yes}</option>
                      <option value="no">{c.no}</option>
                    </select>
                  </label>
                ))}
              </div>
              <div className="recovery-priorities-actions">
                {!plan && <p>{c.confirmHelp}</p>}
                <button className="button button-primary" type="submit">
                  {plan ? c.update : c.confirm}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
        <div className="recovery-privacy-note">
          <LockKeyhole size={18} aria-hidden="true" />
          <p>{c.local}</p>
        </div>
      </section>
      {plan && (
        <>
          <section className="v10-card">
            <h2>{c.goals}</h2>
            {!plan.goals.length && <p>{c.empty}</p>}
            <div className="v10-stack">
              {plan.goals.map((g) => (
                <Goal
                  key={g.id}
                  goal={g}
                  busy={busy}
                  c={c}
                  onChange={(next) =>
                    commit({
                      ...plan,
                      goals: plan.goals.map((old) => (old.id === next.id ? next : old)),
                    })
                  }
                  onRemove={() =>
                    void commit({ ...plan, goals: plan.goals.filter((old) => old.id !== g.id) })
                  }
                />
              ))}
            </div>
          </section>
          <section className="v10-card recovery-no-print">
            <h2>{c.suggestions}</h2>
            {[...suggestions, ...RECOVERY_NEEDS.filter((n) => !suggestions.includes(n))].map(
              (n) => (
                <details key={n}>
                  <summary>{c.templates[n][0]}</summary>
                  <p>{plan.needs[n] === 'yes' ? c.reason : c.general}</p>
                  <p>{c.templates[n][1]}</p>
                  <p>
                    <strong>{c.benefit}: </strong>
                    {c.templates[n][2]}
                  </p>
                  <a href={technicalUrl} target="_blank" rel="noreferrer">
                    {c.technical}
                  </a>
                  <NewGoal
                    template={n}
                    c={c}
                    busy={busy}
                    onAdd={(g) => commit({ ...plan, goals: [...plan.goals, g] })}
                  />
                </details>
              ),
            )}
          </section>
        </>
      )}
      <section className="v10-card">
        <h2>{c.environment}</h2>
        <p>{c.measured}</p>
        <details className="metric-help">
          <summary>{c.metricHelp}</summary>
          <dl>
            <dt>{c.vegetation}</dt>
            <dd>{c.ndviHelp}</dd>
            <dt>{c.rain}</dt>
            <dd>{c.rainHelp}</dd>
            <dt>{c.coverage}</dt>
            <dd>{c.coverageHelp}</dd>
            <dt>{c.change}</dt>
            <dd>{c.changeHelp}</dd>
            <dt>{c.surroundings}</dt>
            <dd>{c.scaleHelp}</dd>
          </dl>
          <a
            href="https://modis.gsfc.nasa.gov/data/dataprod/mod13.php"
            target="_blank"
            rel="noreferrer"
          >
            {c.methodSource}
          </a>
        </details>
        {environment?.basins.length ? (
          <label>
            {c.basin}
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {environment.basins.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>{c.noBasin}</p>
        )}
        {environment?.history ? (
          <>
            <p>
              {c.source}: {c.vegetationSource} · {c.observed}: {environment.history.meta.fecha_dato}
            </p>
            <History
              rows={environment.history.datos.basins.find((b) => b.id === selected)?.rows ?? []}
              c={c}
            />
            <h3>{c.surroundings}</h3>
            <History rows={environment.surroundings} c={c} />
          </>
        ) : (
          <p role="status">{c.historyPending}</p>
        )}
        {environment?.rainfall && (
          <>
            <h3>{c.rain}</h3>
            <p>
              {c.regionNote} ({environment.rainfall.lat}, {environment.rainfall.lon}) · {c.source}:{' '}
              {'NASA POWER'}
              {' · '}
              {c.observed}: {environment.rainfall.indicadores[0]?.fecha}
            </p>
            <History
              rows={(environment.rainfall.serie ?? []).map((p) => ({
                month: p.fecha.slice(0, 7),
                rain: p.valores.lluvia,
                ndvi: null,
                coverage: 0,
                change: null,
              }))}
              c={c}
              rainOnly
            />
          </>
        )}
        {environment?.power && (
          <details>
            <summary>
              {c.regional} · {environment.power.nombre}
            </summary>
            <p>
              {c.regionNote} ({environment.power.lat}, {environment.power.lon})
            </p>
            <table>
              <caption>{c.rain}</caption>
              <thead>
                <tr>
                  <th>{c.date}</th>
                  <th>{c.rain}</th>
                </tr>
              </thead>
              <tbody>
                {environment.power.serie?.map((p) => (
                  <tr key={p.fecha}>
                    <td>{p.fecha}</td>
                    <td>{p.valores.lluvia == null ? '—' : number(p.valores.lluvia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
        <h3>{c.context}</h3>
        {environment?.flood && <p>{c.flood}</p>}
        {environment?.protected && <p>{c.protected}</p>}
        <p>{c.contextNote}</p>
      </section>
    </>
  );
}
function NewGoal({
  template,
  c,
  busy,
  onAdd,
  initial,
}: {
  template: RecoveryNeed;
  c: RecoveryCopy;
  busy: boolean;
  onAdd: (g: RecoveryGoal) => Promise<boolean>;
  initial?: RecoveryGoal;
}) {
  const [error, setError] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    const g: RecoveryGoal = {
      id: initial?.id ?? crypto.randomUUID(),
      template,
      target: Number(d.get('target')),
      unit: initial?.entries.length ? initial.unit : (d.get('unit') as RecoveryGoal['unit']),
      due: String(d.get('due')),
      place: String(d.get('place')),
      budget: d.get('budget') === '' ? null : Number(d.get('budget')),
      status: initial?.status ?? 'pending',
      entries: initial?.entries ?? [],
    };
    if (!validRecoveryGoal(g)) {
      setError(true);
      return;
    }
    if (await onAdd(g)) {
      if (!initial) form.reset();
      setError(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="recovery-fields">
        <label>
          {c.target}
          <input
            name="target"
            type="number"
            min="0.01"
            step="any"
            required
            defaultValue={initial?.target}
          />
        </label>
        <label>
          {c.unit}
          <select
            name="unit"
            disabled={!!initial?.entries.length}
            defaultValue={
              initial?.unit ??
              (template === 'soil'
                ? 'ha'
                : template === 'cattle'
                  ? 'm'
                  : template === 'trees'
                    ? 'trees'
                    : template === 'water'
                      ? 'points'
                      : 'visits')
            }
          >
            {RECOVERY_UNITS.map((u) => (
              <option key={u} value={u}>
                {c.units[u]}
              </option>
            ))}
          </select>
          {!!initial?.entries.length && <small>{c.unitLocked}</small>}
        </label>
        <label>
          {c.due}
          <input name="due" type="date" required defaultValue={initial?.due} />
        </label>
        <label>
          {c.place}
          <input name="place" maxLength={150} defaultValue={initial?.place} />
        </label>
        <label>
          {c.budget}
          <input
            name="budget"
            type="number"
            min="0"
            step="any"
            defaultValue={initial?.budget ?? ''}
          />
        </label>
        <button type="submit">{initial ? c.saveChanges : c.add}</button>
      </fieldset>
      {error && <p role="alert">{c.error}</p>}
    </form>
  );
}
function Goal({
  goal,
  c,
  busy,
  onChange,
  onRemove,
}: {
  goal: RecoveryGoal;
  c: RecoveryCopy;
  busy: boolean;
  onChange: (g: RecoveryGoal) => Promise<boolean>;
  onRemove: () => void;
}) {
  return (
    <article className="recovery-goal">
      <h3>{c.templates[goal.template][0]}</h3>
      <details className="recovery-no-print">
        <summary>{c.editGoal}</summary>
        <NewGoal
          key={`${goal.id}-${goal.target}-${goal.due}-${goal.place}-${goal.budget}-${goal.unit}`}
          template={goal.template}
          initial={goal}
          c={c}
          busy={busy}
          onAdd={onChange}
        />
      </details>
      <p>{c.templates[goal.template][1]}</p>
      <p>
        {goal.place} · {number(goal.target)} {c.units[goal.unit]} · {goal.due}
      </p>
      <label>
        {c.statusLabel}
        <select
          disabled={busy}
          value={goal.status}
          onChange={(e) => void onChange({ ...goal, status: e.target.value as RecoveryStatus })}
        >
          {Object.entries(c.status).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        {c.progress}: {number(recoveryProgress(goal))} %
      </p>
      <progress value={recoveryProgress(goal)} max={100} aria-label={c.progress} />
      <p>{c.progressHelp}</p>
      <p>{c.maintenance}</p>
      <PageLink to={`/records?section=plan&goal=${encodeURIComponent(goal.id)}`}>
        {c.recordProgress}
      </PageLink>
      {goal.entries.length > 0 && (
        <p>
          {c.lastEntry}: {[...goal.entries].sort((a, b) => b.date.localeCompare(a.date))[0].date}
        </p>
      )}
      {!goal.entries.length && (
        <button type="button" disabled={busy} onClick={onRemove}>
          {c.remove}
        </button>
      )}
    </article>
  );
}
function History({
  rows,
  c,
  rainOnly = false,
}: {
  rows: HistoryRow[];
  c: RecoveryCopy;
  rainOnly?: boolean;
}) {
  if (!rows.length) return <p>{c.insufficient}</p>;
  const hasRain = rainOnly || rows.some((r) => r.rain !== null);
  return (
    <>
      <p>{rainOnly ? c.rainHelp : c.ndviHelp}</p>
      <p>
        {rainOnly
          ? `${c.rain}: 0 – ${number(Math.max(1, ...rows.map((r) => r.rain ?? 0)))}`
          : `${c.vegetation}: −0.2 – 1`}
      </p>
      <div className="recovery-chart" role="img" aria-label={rainOnly ? c.rain : c.vegetation}>
        {rows.map((r) => (
          <div
            key={r.month}
            title={`${r.month}: ${(rainOnly ? r.rain : r.ndvi) === null ? '—' : number((rainOnly ? r.rain : r.ndvi)!)}`}
          >
            <span
              style={{
                height: `${rainOnly ? ((r.rain ?? 0) / Math.max(1, ...rows.map((row) => row.rain ?? 0))) * 100 : r.ndvi === null ? 0 : ((r.ndvi + 0.2) / 1.2) * 100}%`,
              }}
            />
            <small>{r.month}</small>
          </div>
        ))}
      </div>
      {!rainOnly && !rows.some((r) => r.change !== null) && <p>{c.insufficient}</p>}
      <details>
        <summary>{rainOnly ? c.rain : `${c.vegetation} · ${c.rain}`}</summary>
        <table>
          <thead>
            <tr>
              <th>{c.date}</th>
              {!rainOnly && <th>{c.vegetation}</th>}
              {hasRain && <th>{c.rain}</th>}
              {!rainOnly && <th>{c.coverage}</th>}
              {!rainOnly && <th>{c.change}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                {!rainOnly && <td>{r.ndvi === null ? '—' : number(r.ndvi)}</td>}
                {hasRain && <td>{r.rain === null ? '—' : number(r.rain)}</td>}
                {!rainOnly && <td>{number(r.coverage * 100)} %</td>}
                {!rainOnly && <td>{r.change === null ? '—' : number(r.change)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
