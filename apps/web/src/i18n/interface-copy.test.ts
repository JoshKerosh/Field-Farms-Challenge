import { describe, expect, it } from 'vitest';
import { interfaceCopy } from './interface-copy';

describe('bilingual interface catalog', () => {
  it('requires matching keys and nonempty translations in both languages', () => {
    expect(Object.keys(interfaceCopy.en).sort()).toEqual(Object.keys(interfaceCopy.es).sort());
    for (const catalog of Object.values(interfaceCopy)) {
      for (const value of Object.values(catalog)) expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
