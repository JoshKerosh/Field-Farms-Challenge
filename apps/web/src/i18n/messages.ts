import { useSyncExternalStore } from 'react';
import es from './messages-es.json';
import en from './messages-en.json';

let language: 'es' | 'en' = 'es';
const listeners = new Set<() => void>();
export const messageLanguage = () => language;
export function setMessageLanguage(next: 'es' | 'en') {
  if (language === next) return;
  language = next;
  listeners.forEach((listener) => listener());
}
export function useMessageLanguage() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    messageLanguage,
    () => 'es' as const,
  );
}
export function message(key: keyof typeof es, ...values: unknown[]): string {
  const template = language === 'en' ? en[key] : es[key];
  return template.replace(/ZXQ(\d+)QXZ/g, (_, index: string) =>
    String(values[Number(index)] ?? ''),
  );
}
/** Re-evaluate module-level presentation tables when read, preserving their public shape. */
export function localizedResource<T extends object>(factory: () => T): T {
  let cachedLanguage = language;
  let cached = factory();
  const target = cached;
  return new Proxy(target, {
    get: (_target, key) => {
      if (cachedLanguage !== language) {
        cachedLanguage = language;
        cached = factory();
      }
      return Reflect.get(cached, key);
    },
  });
}
