import type { FarmRepository } from '../../features/farms';
import type { WatershedRepository } from '../../features/watersheds';
import type { WaterRepository } from '../../features/water';
import type { RestorationRepository } from '../../features/restoration';
import type { EnvironmentRepository } from '../../features/environment';
import type { AlertRepository } from '../../features/alerts';
import type { OrganizationRepository } from '../../features/organizations';
import type { BenefitsRepository } from '../../features/benefits';
import {
  farm,
  watershed,
  sources,
  readings,
  actions,
  indicators,
  alerts,
  incidents,
  organizations,
} from '../fixtures/field';
import { opportunities } from '../fixtures/opportunities';

/** Read-only adapters. No saved records, credentials, or external requests. */
export const demoRepositories = {
  farms: { getFarm: async () => structuredClone(farm) } satisfies FarmRepository,
  watersheds: {
    getWatershed: async () => structuredClone(watershed),
  } satisfies WatershedRepository,
  water: {
    listSources: async () => structuredClone(sources),
    listReadings: async () => structuredClone(readings),
  } satisfies WaterRepository,
  restoration: {
    listActions: async () => structuredClone(actions),
  } satisfies RestorationRepository,
  environment: {
    listIndicators: async () => structuredClone(indicators),
  } satisfies EnvironmentRepository,
  alerts: {
    listAlerts: async () => structuredClone(alerts),
    listIncidents: async () => structuredClone(incidents),
  } satisfies AlertRepository,
  organizations: {
    listOrganizations: async () => structuredClone(organizations),
  } satisfies OrganizationRepository,
  benefits: {
    listOpportunities: async () => structuredClone(opportunities),
  } satisfies BenefitsRepository,
};
