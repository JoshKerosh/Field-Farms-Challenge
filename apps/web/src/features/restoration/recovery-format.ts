export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const number = (n: number) =>
  new Intl.NumberFormat(document.documentElement.lang || 'es', { maximumFractionDigits: 2 }).format(
    n,
  );
export const money = (n: number) =>
  new Intl.NumberFormat(document.documentElement.lang || 'es', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(n);
