import { Droplet, MapPin, Users } from 'lucide-react';
import { copy } from '../../i18n';
import { PageHeader, PageLink } from '../../shared/ui';

export function GuidePage() {
  const c = copy.guide;
  return (
    <>
      <section className="welcome-section">
        <div className="welcome-copy">
          <span className="section-kicker">{c.kicker}</span>
          <PageHeader title={c.title} intro={c.intro} />
          <div className="action-row">
            <PageLink to="/farm" primary>
              {c.start}
            </PageLink>
            <PageLink to="/watershed">{c.secondary}</PageLink>
          </div>
        </div>
        <div className="journey-panel">
          <h2>{c.journey}</h2>
          <ol className="journey-list">
            {[
              { icon: MapPin, label: c.farm },
              { icon: Droplet, label: c.source },
              { icon: Users, label: c.community },
            ].map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={24} aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <p className="source-note">{c.journeyNote}</p>
        </div>
      </section>
      <div className="content-columns">
        <section className="guide-steps">
          <h2>{c.how}</h2>
          {c.steps.map((step) => (
            <article className="guide-step" key={step.letter}>
              <span className="step-letter" aria-hidden="true">
                {step.letter}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <PageLink to={step.to}>{step.action}</PageLink>
              </div>
            </article>
          ))}
        </section>
        <aside className="support-column">
          <section className="benefit-panel">
            <span className="section-kicker">{c.benefitKicker}</span>
            <h2>{c.benefitsTitle}</h2>
            <p>{c.benefitsText}</p>
            <PageLink to="/benefits">{c.benefitsAction}</PageLink>
          </section>
          <section className="help-note">
            <h2>{c.helpTitle}</h2>
            <p>{c.helpText}</p>
            <PageLink to="/assistant">{c.helpAction}</PageLink>
          </section>
        </aside>
      </div>
    </>
  );
}
