export type OpportunityKind = 'payment' | 'credit' | 'recognition' | 'grant';
export type OpportunityAvailability = 'open' | 'closed' | 'verify';

export interface SupportOpportunity {
  id: string;
  title: string;
  organization: string;
  kind: OpportunityKind;
  region: string;
  description: string;
  requirements: string;
  sourceUrl: string;
  reviewedAt: string;
  availability: OpportunityAvailability;
  deadline?: string;
}

/** An advertised deadline can close a call; it cannot establish eligibility. */
export function opportunityAvailability(
  opportunity: SupportOpportunity,
  asOf: string,
): OpportunityAvailability {
  if (opportunity.deadline && opportunity.deadline < asOf) return 'closed';
  return opportunity.availability;
}
