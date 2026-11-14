import { ArrowRight, Clock, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Provenance } from '@field-farms/domain';
import { Link } from 'react-router-dom';
import { copy, date } from '../../i18n';

export function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="page-heading">
      <h1 id="page-title" tabIndex={-1}>
        {title}
      </h1>
      <p>{intro}</p>
    </header>
  );
}

export function PageLink({
  to,
  children,
  primary = false,
}: {
  to: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link className={primary ? 'button button-primary' : 'text-link'} to={to}>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'blue';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function PendingAction({ children }: { children: ReactNode }) {
  return (
    <span className="pending-action">
      <button className="button button-secondary" disabled>
        <Clock size={17} aria-hidden="true" />
        {children}
      </button>
      <span>{copy.common.pendingHint}</span>
    </span>
  );
}

export function SourceNote({ provenance }: { provenance: Provenance }) {
  return (
    <p className="source-note">
      {provenance.origin === 'demo' ? copy.common.exampleData : provenance.source} ·{' '}
      {date(provenance.asOf)}
    </p>
  );
}

export function ExternalSource({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ExternalLink size={16} aria-label={copy.common.newTab} />
    </a>
  );
}
