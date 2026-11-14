import type { Organization } from '@field-farms/domain';
export interface OrganizationRepository {
  listOrganizations(): Promise<Organization[]>;
}
