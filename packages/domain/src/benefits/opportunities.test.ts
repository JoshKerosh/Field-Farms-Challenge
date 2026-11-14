import { describe, expect, it } from 'vitest';
import { opportunityAvailability, type SupportOpportunity } from './index';

const opportunity: SupportOpportunity = {
  id: 'call',
  title: 'Convocatoria',
  organization: 'Entidad',
  kind: 'grant',
  region: 'Costa Rica',
  description: 'Referencia',
  requirements: 'Consultar',
  sourceUrl: 'https://example.org',
  reviewedAt: '2026-10-01',
  deadline: '2026-10-31',
  availability: 'open',
};

describe('vigencia de oportunidades', () => {
  it('cierra un plazo vencido aunque el catálogo todavía diga abierto', () => {
    expect(opportunityAvailability(opportunity, '2026-11-14')).toBe('closed');
  });
  it('conserva la fecha de cierre como parte del período publicado', () => {
    expect(opportunityAvailability(opportunity, '2026-10-31')).toBe('open');
  });
  it('no convierte una referencia por verificar en una oferta abierta', () => {
    expect(
      opportunityAvailability(
        { ...opportunity, availability: 'verify', deadline: undefined },
        '2026-11-14',
      ),
    ).toBe('verify');
  });
});
