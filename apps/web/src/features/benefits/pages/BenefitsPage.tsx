import { opportunityAvailability, type SupportOpportunity } from '@field-farms/domain';
import { Check, HandCoins } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useField } from '../../../app/context/FieldContext';
import { CONSERVATION_ACTIONS } from '../../../data/engine/farm';
import { copy, date } from '../../../i18n';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { Badge, ExternalSource, PageHeader, PageLink } from '../../../shared/ui';
type Filter = 'all' | 'economic' | 'recognition';
export function BenefitsPage() {
  useMessageLanguage();
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
          <span className="section-kicker">{message('mf805f1033456')}</span>
          <h2>
            {doneCount > 0
              ? message('mc7cb13013899', doneCount, ctx?.sub.n ?? message('md3c06f1736a8'))
              : message('md08dcf24c896')}
          </h2>
          <p>
            {message('mde269f5f73b7')}
            <strong>{doneCount}</strong>
            {message('mf5405d295f86')}
            <strong>{planCount}</strong>
            {message('mde7b8d54e33e')} <strong>{recs.length}</strong>
            {message('mb3d725d14436')}{' '}
            {plan?.rip.has
              ? message(
                  'm886c87e83aac',
                  ctx?.sub.n,
                  plan.rip.haUrg,
                  journey?.op ?? message('m727aee862d5e'),
                )
              : ''}
          </p>
          <div className="v10-pill-row" style={{ marginTop: 12 }}>
            <PageLink to="/care" primary>
              {message('m768d9cc61d26')}
            </PageLink>
            <PageLink to="/records">{message('m0e47dd6dbeb2')}</PageLink>
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
