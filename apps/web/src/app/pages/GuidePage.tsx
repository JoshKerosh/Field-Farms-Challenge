import { useMessageLanguage } from '../../i18n/messages';
import { useI18n } from '../../i18n/use-i18n';
import { PageHeader, PageLink } from '../../shared/ui';
export function GuidePage() {
  useMessageLanguage();
  const { copy: c } = useI18n();
  const steps = [
    { title: c.farm, text: c.locateHelp, to: '/farm', action: c.locateAction },
    { title: c.watershed, text: c.watershedHelp, to: '/watershed', action: c.watershed },
    { title: c.care, text: c.careHelp, to: '/care', action: c.care },
  ];
  return (
    <div className="v10-stack guide-page">
      <PageHeader title={c.guideTitle} intro={c.guideIntro} />
      <div className="v10-grid-3">
        {steps.map((step) => (
          <section className="v10-card content-card" key={step.to}>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            <PageLink to={step.to}>{step.action}</PageLink>
          </section>
        ))}
      </div>
      <section className="v10-card content-card">
        <h2>{c.records}</h2>
        <p>{c.recordsHelp}</p>
        <p>{c.localHelp}</p>
        <PageLink to="/records">{c.records}</PageLink>
      </section>
      <p className="source-note">{c.territoryHelp}</p>
    </div>
  );
}
