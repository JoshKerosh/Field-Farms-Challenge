export type RecoveryNeed = 'water' | 'soil' | 'cattle' | 'trees' | 'shade' | 'season';
export type RecoveryAnswer = 'yes' | 'no' | 'unknown';
export type RecoveryStatus = 'pending' | 'active' | 'completed' | 'maintenance';
export interface RecoveryEntry {
  id: string;
  date: string;
  quantity: number;
  note: string;
  expense: number;
  photos: { id: string; data: ArrayBuffer }[];
}
export interface RecoveryGoal {
  id: string;
  template: RecoveryNeed;
  target: number;
  unit: 'points' | 'm' | 'ha' | 'trees' | 'visits';
  due: string;
  place: string;
  budget: number | null;
  status: RecoveryStatus;
  entries: RecoveryEntry[];
}
export interface RecoveryPlan {
  origin?: 'manual';
  version: 1;
  farmId: string;
  farmName: string;
  profile: { activity: string; hectares: number; animals: number; water: string };
  confirmedAt: string;
  needs: Record<RecoveryNeed, RecoveryAnswer>;
  goals: RecoveryGoal[];
}
export const RECOVERY_NEEDS: RecoveryNeed[] = [
  'water',
  'soil',
  'cattle',
  'trees',
  'shade',
  'season',
];
export const RECOVERY_UNITS = ['points', 'm', 'ha', 'trees', 'visits'] as const;
export function recoveryFarmId(site: {
  lat: number;
  lng: number;
  parcel: { properties: { identifica: string } } | null;
}): string {
  return site.parcel
    ? `siri-${site.parcel.properties.identifica}`
    : `point:${site.lat.toFixed(5)},${site.lng.toFixed(5)}`;
}
export function suggestedRecoveryNeeds(needs: RecoveryPlan['needs']): RecoveryNeed[] {
  const yes = RECOVERY_NEEDS.filter((n) => needs[n] === 'yes');
  return (yes.length ? yes : (['water', 'soil', 'season'] as RecoveryNeed[])).slice(0, 3);
}
export function recoveryProgress(goal: RecoveryGoal): number {
  const latest = [...goal.entries].reverse().sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? Math.min(100, Math.max(0, (100 * latest.quantity) / goal.target)) : 0;
}
export function recoveryExpenses(goal: RecoveryGoal): number {
  return goal.entries.reduce((sum, e) => sum + e.expense, 0);
}
export function validRecoveryGoal(goal: RecoveryGoal): boolean {
  return (
    RECOVERY_NEEDS.includes(goal.template) &&
    RECOVERY_UNITS.includes(goal.unit) &&
    Number.isFinite(goal.target) &&
    goal.target > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(goal.due) &&
    Number.isFinite(Date.parse(goal.due)) &&
    new Date(goal.due).toISOString().slice(0, 10) === goal.due &&
    (goal.budget === null || (Number.isFinite(goal.budget) && goal.budget >= 0))
  );
}
