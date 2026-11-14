import type { FieldAlert } from '@field-farms/domain';
import { TriangleAlert } from 'lucide-react';
import { useLoaderData } from 'react-router-dom';
import { copy } from '../../../i18n';
import { Badge, PageHeader, PageLink, PendingAction } from '../../../shared/ui';

export function AlertsPage() {
  const alerts = useLoaderData<FieldAlert[]>();
  const c = copy.alerts;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      {alerts.map((alert) => (
        <article className="notice-panel" key={alert.id}>
          <Badge tone="amber">{c.label}</Badge>
          <div className="section-heading">
            <TriangleAlert size={24} aria-hidden="true" />
            <h2>{alert.title}</h2>
          </div>
          <p>{alert.description}</p>
          <p>{alert.nextStep}</p>
          <PageLink to="/records">{c.records}</PageLink>
        </article>
      ))}
      <section className="page-section">
        <div className="action-row">
          <PendingAction>{c.report}</PendingAction>
          <PendingAction>{c.notify}</PendingAction>
        </div>
        <p className="muted">{c.next}</p>
      </section>
    </>
  );
}
