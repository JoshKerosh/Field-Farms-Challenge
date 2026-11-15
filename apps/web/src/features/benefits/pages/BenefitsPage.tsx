import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Check, HandCoins } from 'lucide-react';
import { opportunityAvailability, type SupportOpportunity } from '@field-farms/domain';
import { CONSERVATION_ACTIONS } from '../../../data/engine/farm';
import { copy, date } from '../../../i18n';
import { Badge, ExternalSource, PageHeader, PageLink } from '../../../shared/ui';
import { useField } from '../../../app/context/FieldContext';

type Filter = 'all' | 'economic' | 'recognition';

export function BenefitsPage() {
  const opportunities = useLoaderData<SupportOpportunity[]>();
  const { ctx, journey, plan, acts, recs } = useField();
  const [filter, setFilter] = useState<Filter>('all');
  const c = copy.benefits;
  const visible = opportunities.filter(
    (opportunity) =>
      filter === 'all' ||
      (filter === 'recognition'
        ? opportunity.kind === 'recognition'
        : opportunity.kind !== 'recognition'),
  );
  const today = new Date().toISOString().slice(0, 10);
  const doneCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'hecho').length;
  const planCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'plan').length;

  return (
    <div className="v10-stack">
      <PageHeader title={c.title} intro={c.intro} />
      <section className="savings-panel">
        <div>
          <span className="section-kicker">Tu avance hacia PSA y reconocimientos</span>
          <h2>
            {doneCount > 0
              ? `${doneCount} acciones activas en ${ctx?.sub.n ?? 'tu subcuenca'}`
              : 'Empieza a documentar acciones en finca'}
          </h2>
          <p>
            Tienes <strong>{doneCount}</strong> prácticas aplicadas, <strong>{planCount}</strong> en plan y{' '}
            <strong>{recs.length}</strong> registros en este dispositivo.{' '}
            {plan?.rip.has
              ? `En ${ctx?.sub.n} hay ${plan.rip.haUrg} ha prioritarias de ribera cerca de ${journey?.op ?? 'tu ASADA'}.`
              : ''}
          </p>
          <div className="v10-pill-row" style={{ marginTop: 12 }}>
            <PageLink to="/care" primary>
              Marcar acciones en finca
            </PageLink>
            <PageLink to="/records">Ver mis registros</PageLink>
          </div>
        </div>
        <ul className="check-list">
          {c.inputs.map((input) => (
            <li key={input}>
              <Check size={19} aria-hidden="true" />
              {input}
            </li>
          ))}
        </ul>
      </section>
      <section className="page-section">
        <div className="section-heading">
          <HandCoins size={25} aria-hidden="true" />
          <h2>{c.catalog}</h2>
        </div>
        <p>{c.catalogIntro}</p>
        <div className="filter-group" role="group" aria-label={c.filterLabel}>
          {(
            [
              { id: 'all', label: c.all },
              { id: 'economic', label: c.economic },
              { id: 'recognition', label: c.recognition },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className="filter-button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="opportunities-list">
          {visible.map((opportunity) => {
            const availability = opportunityAvailability(opportunity, today);
            return (
              <article className="opportunity" key={opportunity.id}>
                <div className="opportunity-meta">
                  <span className="small-label">{opportunity.organization}</span>
                  <Badge tone={availability === 'closed' ? 'amber' : 'neutral'}>
                    {
                      copy.common[
                        availability === 'closed'
                          ? 'closed'
                          : availability === 'open'
                            ? 'open'
                            : 'reviewRequired'
                      ]
                    }
                  </Badge>
                </div>
                <h3>{opportunity.title}</h3>
                <p className="opportunity-kind">
                  {c.kind[opportunity.kind]} · {opportunity.region}
                </p>
                <p>{opportunity.description}</p>
                <details>
                  <summary>{c.requirements}</summary>
                  <p>{opportunity.requirements}</p>
                </details>
                {opportunity.deadline && (
                  <p className="deadline">
                    {c.deadline}: {date(opportunity.deadline)}
                  </p>
                )}
                <div className="opportunity-footer">
                  <ExternalSource href={opportunity.sourceUrl}>
                    {copy.common.sourceLink}
                  </ExternalSource>
                  <span className="source-note">
                    {copy.common.reviewed}: {date(opportunity.reviewedAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        {visible.length === 0 && <p>{c.empty}</p>}
        <p className="muted">{c.noCertificates}</p>
      </section>
    </div>
  );
}
