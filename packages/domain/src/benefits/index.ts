export type OpportunityKind = 'payment' | 'credit' | 'recognition' | 'grant';
export type OpportunityAvailability = 'open' | 'closed' | 'verify';

export interface OpportunityDetails {
  forWhom: string;
  offers: string[];
  documents: string[];
  steps: string[];
  obligations: string[];
  contact: { label: string; url: string };
  sources: { label: string; url: string }[];
}

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
  details?: OpportunityDetails;
}

/** An advertised deadline can close a call; it cannot establish eligibility. */
export function opportunityAvailability(
  opportunity: SupportOpportunity,
  asOf: string,
): OpportunityAvailability {
  if (opportunity.deadline && opportunity.deadline < asOf) return 'closed';
  return opportunity.availability;
}
