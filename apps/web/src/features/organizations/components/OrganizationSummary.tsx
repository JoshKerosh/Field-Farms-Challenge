import type { Organization } from '@field-farms/domain';
import { Users } from 'lucide-react';
import { copy } from '../../../i18n';
import { useMessageLanguage } from '../../../i18n/messages';
export function OrganizationSummary({ organizations }: { organizations: Organization[] }) {
  useMessageLanguage();
  return (
    <section className="page-section">
      <div className="section-heading">
        <Users size={23} aria-hidden="true" />
        <h2>{copy.water.allies}</h2>
      </div>
      <ul className="item-list">
        {organizations.map((organization) => (
          <li key={organization.id}>
            <div>
              <h3>{organization.name}</h3>
              <p>{organization.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
