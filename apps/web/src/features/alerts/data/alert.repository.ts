import type { FieldAlert, FieldIncident } from '@field-farms/domain';
export interface AlertRepository {
  listAlerts(): Promise<FieldAlert[]>;
  listIncidents(): Promise<FieldIncident[]>;
}
