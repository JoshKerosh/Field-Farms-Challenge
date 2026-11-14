import type { SupportOpportunity } from '@field-farms/domain';
export interface BenefitsRepository {
  listOpportunities(): Promise<SupportOpportunity[]>;
}
