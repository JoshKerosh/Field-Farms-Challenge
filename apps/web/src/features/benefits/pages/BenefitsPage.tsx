import {
  recoveryFarmId,
  opportunityAvailability,
  type SupportOpportunity,
} from '@field-farms/domain';
import { HandCoins } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useField } from '../../../app/context/FieldContext';
import { useRecoveryPlan } from '../../restoration/data/use-recovery-plan';
import { useBenefitsCopy } from '../benefits-copy';
import { copy, date } from '../../../i18n';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { Badge, ExternalSource, PageHeader, PageLink } from '../../../shared/ui';
import './benefits.css';
type Filter = 'all' | 'economic' | 'recognition';
export function BenefitsPage() {
  useMessageLanguage();
  const opportunities = useLoaderData<SupportOpportunity[]>();
  const { farmSite, myFarm } = useField();
  const { plan, ready, readingFailed } = useRecoveryPlan(
    farmSite && myFarm ? recoveryFarmId(farmSite) : null,
  );
  const labels = useBenefitsCopy();
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
  const doneCount = plan?.goals.filter((g) => g.status === 'completed').length ?? 0;
  const planCount = (plan?.goals.length ?? 0) - doneCount;
  const entryCount = plan?.goals.reduce((n, g) => n + g.entries.length, 0) ?? 0;
  return (
    <div className="v10-stack benefits-page">
      <PageHeader title={c.title} intro={c.intro} />
      <section className="savings-panel benefits-summary">
        <div>
          <span className="section-kicker">{labels.summary}</span>
          <h2>{plan?.goals.length ? myFarm?.name : message('md08dcf24c896')}</h2>
          <p>{labels.summaryHelp}</p>
          {!ready ? (
            <p role="status">{labels.loading}</p>
          ) : readingFailed ? (
            <p role="alert">{labels.error}</p>
          ) : (
            <dl className="benefit-summary">
              <div>
                <dt>{labels.done}</dt>
                <dd>{doneCount}</dd>
              </div>
              <div>
                <dt>{labels.planned}</dt>
                <dd>{planCount}</dd>
              </div>
              <div>
                <dt>{labels.entries}</dt>
                <dd>{entryCount}</dd>
              </div>
            </dl>
          )}
          <div className="v10-pill-row" style={{ marginTop: 12 }}>
            <PageLink to="/care" primary>
              {message('m768d9cc61d26')}
            </PageLink>
            <PageLink to="/records">{message('m0e47dd6dbeb2')}</PageLink>
          </div>
        </div>
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
                  <summary>{labels.details}</summary>
                  <p>{opportunity.requirements}</p>
                  {opportunity.details && (
                    <div className="opportunity-details">
                      <h4>{labels.forWhom}</h4>
                      <p>{opportunity.details.forWhom}</p>
                      {(['offers', 'documents', 'steps', 'obligations'] as const).map((key) => (
                        <section key={key}>
                          <h4>{labels[key]}</h4>
                          {key === 'steps' ? (
                            <ol>
                              {opportunity.details![key].map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ol>
                          ) : (
                            <ul>
                              {opportunity.details![key].map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </section>
                      ))}
                      <h4>{labels.contact}</h4>
                      <a href={opportunity.details.contact.url} target="_blank" rel="noreferrer">
                        {opportunity.details.contact.label}
                      </a>
                      <h4>{labels.sources}</h4>
                      <ul>
                        {opportunity.details.sources.map((source) => (
                          <li key={source.url}>
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
