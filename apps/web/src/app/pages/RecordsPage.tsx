import type {
  DemoRole,
  WaterReading,
  WaterSource,
  RestorationAction,
  FieldIncident,
  Organization,
} from '@field-farms/domain';
import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { WaterHistory } from '../../features/water';
import { OrganizationSummary } from '../../features/organizations';
import { copy, date } from '../../i18n';
import { Badge, PageHeader, PendingAction } from '../../shared/ui';

export interface RecordsPageData {
  readings: WaterReading[];
  sources: WaterSource[];
  actions: RestorationAction[];
  incidents: FieldIncident[];
  organizations: Organization[];
}

export function RecordsPage() {
  const data = useLoaderData<RecordsPageData>();
  const [role, setRole] = useState<DemoRole>('farmer');
  const c = copy.water;
  return (
    <>
      <PageHeader title={c.recordsTitle} intro={c.recordsIntro} />
      <fieldset className="role-selector">
        <legend>{c.chooseRole}</legend>
        <div>
          {(Object.keys(copy.demo.roles) as DemoRole[]).map((key) => (
            <button
              key={key}
              className="filter-button"
              aria-pressed={role === key}
              onClick={() => setRole(key)}
            >
              {copy.demo.roles[key]}
            </button>
          ))}
        </div>
        <p className="source-note">{c.roleNote}</p>
      </fieldset>
      <div className="section-heading board-heading">
        <h2>{c.boards[role]}</h2>
        <Badge tone="amber">{copy.demo.label}</Badge>
      </div>
      <WaterHistory readings={data.readings} sources={data.sources} />
      <div className="records-columns">
        <section className="page-section">
          <h2>{c.actions}</h2>
          <ul className="compact-list">
            {data.actions.map((action) => (
              <li key={action.id}>
                <span>{action.title}</span>
                <Badge tone={action.status === 'done' ? 'green' : 'neutral'}>
                  {action.status === 'done' ? copy.restoration.done : copy.restoration.planned}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
        <section className="page-section">
          <h2>{c.incidents}</h2>
          <ul className="compact-list">
            {data.incidents.map((incident) => (
              <li key={incident.id}>
                <div>
                  <h3>{incident.title}</h3>
                  <p>{incident.note}</p>
                  <span className="source-note">{date(incident.recordedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="action-row">
        <PendingAction>{c.add}</PendingAction>
        <PendingAction>{c.csv}</PendingAction>
      </div>
      <p className="muted">{c.next}</p>
      <OrganizationSummary organizations={data.organizations} />
    </>
  );
}
