import { describe, it, expect } from 'bun:test';
import {
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
} from '../src/index.ts';

describe('RadioGroupBuilder', () => {
  const opt1 = new RadioGroupOptionBuilder({ value: 'a', label: 'Option A' });
  const opt2 = new RadioGroupOptionBuilder({ value: 'b', label: 'Option B' });
  const opt3 = new RadioGroupOptionBuilder({ value: 'c', label: 'Option C' });

  it('creates a radio group with 2+ options', () => {
    const rg = new RadioGroupBuilder({
      customId: 'choice',
      options: [opt1, opt2],
    });
    const json = rg.toJSON();
    expect(json.type).toBe(21);
    expect(json.custom_id).toBe('choice');
    expect((json.options as unknown[]).length).toBe(2);
  });

  it('throws if fewer than 2 options', () => {
    expect(() =>
      new RadioGroupBuilder({
        customId: 'x',
        options: [opt1] as never,
      }),
    ).toThrow('options');
  });

  it('throws if options exceed 10', () => {
    const opts = Array.from({ length: 11 }, (_, i) =>
      new RadioGroupOptionBuilder({ value: `v${i}`, label: `L${i}` }),
    );
    expect(() =>
      new RadioGroupBuilder({ customId: 'x', options: opts as never }),
    ).toThrow('options');
  });

  it('toJSON() throws if fewer than 2 options after splice', () => {
    const rg = new RadioGroupBuilder({ customId: 'x', options: [opt1, opt2] });
    expect(() => rg.spliceOptions(0, 2)).toThrow('options');
  });

  it('addOptions throws when exceeding 10', () => {
    const rg = new RadioGroupBuilder({
      customId: 'x',
      options: Array.from({ length: 10 }, (_, i) =>
        new RadioGroupOptionBuilder({ value: `v${i}`, label: `L${i}` }),
      ),
    });
    expect(() =>
      rg.addOptions(new RadioGroupOptionBuilder({ value: 'y', label: 'Y' })),
    ).toThrow('more than 10');
  });

  it('sets required', () => {
    const rg = new RadioGroupBuilder({
      customId: 'x',
      options: [opt1, opt2],
      required: true,
    });
    expect(rg.toJSON().required).toBe(true);
  });

  it('toJSON correctly serializes options', () => {
    const rg = new RadioGroupBuilder({
      customId: 'x',
      options: [opt1, opt2, opt3],
    });
    const json = rg.toJSON();
    const opts = json.options as { value: string; label: string }[];
    expect(opts[0]?.value).toBe('a');
    expect(opts[1]?.label).toBe('Option B');
  });
});

describe('RadioGroupOptionBuilder', () => {
  it('creates with value and label', () => {
    const opt = new RadioGroupOptionBuilder({ value: 'yes', label: 'Yes' });
    expect(opt.toJSON().value).toBe('yes');
    expect(opt.toJSON().label).toBe('Yes');
  });

  it('sets default and description', () => {
    const opt = new RadioGroupOptionBuilder({
      value: 'x',
      label: 'X',
      description: 'Pick this',
      default: true,
    });
    const json = opt.toJSON();
    expect(json.description).toBe('Pick this');
    expect(json.default).toBe(true);
  });
});
