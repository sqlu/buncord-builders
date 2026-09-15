import { expect, it } from 'bun:test';
import { TextInputBuilder } from '../src/index.ts';
import type { IsLessThanOrEqual } from '../src/utils/guards.ts';

it('supports literal text input bounds through 4000 without excessive type recursion', () => {
  expect(new TextInputBuilder({ customId: 'bio', minLength: 0, maxLength: 1000 }).maxLength).toBe(1000);
  expect(new TextInputBuilder({ customId: 'bio', minLength: 3000, maxLength: 4000 }).minLength).toBe(3000);
  expect(new TextInputBuilder({ customId: 'bio', minLength: 4000, maxLength: 4000 }).maxLength).toBe(4000);
  // @ts-expect-error Literal minimum exceeds literal maximum.
  expect(() => new TextInputBuilder({ customId: 'bio', minLength: 3000, maxLength: 2999 })).toThrow();
});

it('compares numeric bounds across decimal digit boundaries', () => {
  const smaller: IsLessThanOrEqual<999, 1000> = true;
  const larger: IsLessThanOrEqual<4000, 3999> = false;
  const equal: IsLessThanOrEqual<4000, 4000> = true;
  const broad: IsLessThanOrEqual<number, 4000> = true;
  expect([smaller, larger, equal, broad]).toEqual([true, false, true, true]);
});

it('checks every possible pairing of literal union bounds', () => {
  const unsafeMaximum: IsLessThanOrEqual<10, 2 | 20> = false;
  const partlyEqual: IsLessThanOrEqual<2, 1 | 2> = false;
  const safe: IsLessThanOrEqual<1 | 2, 3 | 4> = true;
  const unsafeMinimum: IsLessThanOrEqual<1 | 5, 3> = false;
  expect([unsafeMaximum, partlyEqual, safe, unsafeMinimum]).toEqual([false, false, true, false]);
});
