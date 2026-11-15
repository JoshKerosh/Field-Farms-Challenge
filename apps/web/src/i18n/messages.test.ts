import { afterEach, describe, expect, it } from 'vitest';
import es from './messages-es.json';
import en from './messages-en.json';
import { localizedResource, message, setMessageLanguage } from './messages';

afterEach(() => setMessageLanguage('es'));
describe('application translations', () => {
  it('preserves all keys and interpolation arguments in both catalogs', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(en[key].trim(), key).not.toBe('');
      expect(en[key].match(/ZXQ\d+QXZ/g)?.sort() ?? [], key).toEqual(
        es[key].match(/ZXQ\d+QXZ/g)?.sort() ?? [],
      );
    }
  });
  it('updates presentation tables without changing their identity on ordinary reads', () => {
    const resource = localizedResource(() => ({ nested: { label: message('mba8875d8f580') } }));
    expect(resource.nested).toBe(resource.nested);
    expect(resource.nested.label).toBe('Mi finca');
    setMessageLanguage('en');
    expect(resource.nested.label).toBe('My farm');
    expect(resource.nested).toBe(resource.nested);
  });
});
