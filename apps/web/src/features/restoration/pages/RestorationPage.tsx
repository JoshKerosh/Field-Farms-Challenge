import type { RestorationAction } from '@field-farms/domain';
import { Check, Clock, Sprout } from 'lucide-react';
import { useLoaderData } from 'react-router-dom';
import { copy } from '../../../i18n';
import { Badge, PageHeader, PageLink, PendingAction } from '../../../shared/ui';

export function RestorationPage() {
  const actions = useLoaderData<RestorationAction[]>();
  const c = copy.restoration;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <section>
        <div className="section-heading">
          <h2>{c.actionsTitle}</h2>
          <Badge tone="green">
            {actions.filter((action) => action.status === 'done').length} / {actions.length}
          </Badge>
        </div>
        <ul className="action-list">
          {actions.map((action) => (
            <li key={action.id}>
              <span className={`action-marker ${action.status === 'done' ? 'is-done' : ''}`}>
                {action.status === 'done' ? (
                  <Check size={20} aria-hidden="true" />
                ) : (
                  <Clock size={20} aria-hidden="true" />
                )}
              </span>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <span className="action-benefit">{action.benefit}</span>
                <Badge tone={action.status === 'done' ? 'green' : 'neutral'}>
                  {action.status === 'done' ? c.done : c.planned}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
        <PendingAction>{c.newAction}</PendingAction>
      </section>
      <section className="page-section">
        <div className="section-heading">
          <Sprout size={24} aria-hidden="true" />
          <h2>{c.mapTitle}</h2>
        </div>
        <p>{c.mapText}</p>
        <p className="muted">{c.mapNote}</p>
        <PendingAction>{c.mapAction}</PendingAction>
      </section>
      <section className="benefit-panel">
        <h2>{c.benefitTitle}</h2>
        <p>{c.benefitText}</p>
        <PageLink to="/benefits">{c.benefitAction}</PageLink>
      </section>
    </>
  );
}
