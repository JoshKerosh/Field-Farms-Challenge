import { useSearchParams } from 'react-router-dom';
import { recoveryFarmId, recoveryExpenses } from '@field-farms/domain';
import { useField } from '../../../app/context/FieldContext';
import { PageLink } from '../../../shared/ui';
import { useRecoveryPlan } from '../data/use-recovery-plan';
import { useRecoveryCopy } from '../recovery-copy';
import { GoalRecords } from './GoalRecords';
import { RecoveryBackup } from './RecoveryBackup';
import { money } from '../recovery-format';
import '../pages/recovery.css';

export function RecoveryRecords() {
  const { farmSite, myFarm } = useField();
  const c = useRecoveryCopy();
  const id = farmSite && myFarm ? recoveryFarmId(farmSite) : null;
  const { plan, ready, busy, setBusy, saved, error, readingFailed, commit } = useRecoveryPlan(id);
  const [params, setParams] = useSearchParams();
  const selected = plan?.goals.find((g) => g.id === params.get('goal'));
  if (!id)
    return (
      <section className="v10-card content-card">
        <p>{c.locate}</p>
        <PageLink to="/farm">{c.farm}</PageLink>
      </section>
    );
  if (!ready) return <p role="status">{c.loading}</p>;
  if (readingFailed) return <p role="alert">{error}</p>;
  return (
    <div className="recovery v10-stack">
      <div role="status">{busy ? c.saving : saved ? c.saved : ''}</div>
      {error && <p role="alert">{error}</p>}
      <section className="v10-card content-card">
        <h2>{myFarm?.name || c.farm}</h2>
        <p>{c.recordsHelp}</p>
        <p>{c.local}</p>
        <PageLink to="/care">{c.backToPlan}</PageLink>
        {!plan?.goals.length ? (
          <p>{c.empty}</p>
        ) : (
          <label>
            {c.chooseGoal}
            <select
              value={selected?.id ?? ''}
              onChange={(e) =>
                setParams({ section: 'plan', ...(e.target.value ? { goal: e.target.value } : {}) })
              }
            >
              <option value="">{c.allGoals}</option>
              {plan.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {c.templates[g.template][0]}
                  {g.place ? ` · ${g.place}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {plan &&
        (selected ? [selected] : plan.goals).map((goal) => (
          <GoalRecords
            key={goal.id}
            goal={goal}
            c={c}
            busy={busy}
            onPreparing={setBusy}
            onChange={(next) =>
              commit({ ...plan, goals: plan.goals.map((g) => (g.id === next.id ? next : g)) })
            }
          />
        ))}
      {plan && (
        <section className="v10-card content-card">
          <h2>{c.costs}</h2>
          <dl>
            <dt>{c.spent}</dt>
            <dd>{money(plan.goals.reduce((sum, g) => sum + recoveryExpenses(g), 0))}</dd>
            <dt>{c.totalBudget}</dt>
            <dd>
              {plan.goals.some((g) => g.budget !== null)
                ? money(plan.goals.reduce((sum, g) => sum + (g.budget ?? 0), 0))
                : c.noBudget}
            </dd>
          </dl>
        </section>
      )}
      <RecoveryBackup
        plan={plan}
        id={id}
        name={myFarm?.name || c.farm}
        busy={busy}
        c={c}
        onRestore={commit}
      />
      {plan && (
        <button type="button" className="recovery-no-print" onClick={() => window.print()}>
          {c.print}
        </button>
      )}
    </div>
  );
}
