export function isLegacyExampleName(name: string): boolean {
  return /^(finca|finja)\s+ejemplo$/i.test(name.trim());
}
