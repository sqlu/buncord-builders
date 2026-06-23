import { describe, it, expect } from 'bun:test';
import {
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
} from '../src/index.ts';

describe('CheckboxBuilder', () => {
  it('creates a checkbox with customId', () => {
    const cb = new CheckboxBuilder({ customId: 'accept_tos' });
    const json = cb.toJSON();
    expect(json.type).toBe(23);
    expect(json.custom_id).toBe('accept_tos');
  });

  it('sets default to true', () => {
    const cb = new CheckboxBuilder({ customId: 'x', default: true });
    expect(cb.toJSON().default).toBe(true);
  });

  it('can be created empty or with empty object', () => {
    const cb1 = new CheckboxBuilder();
    expect(cb1.toJSON().type).toBe(23);
    const cb2 = new CheckboxBuilder({});
    expect(cb2.toJSON().type).toBe(23);
  });

  it('setDefault updates the value', () => {
    const cb = new CheckboxBuilder({ customId: 'x' });
    cb.setDefault(true);
    expect(cb.toJSON().default).toBe(true);
    cb.setDefault(false);
    expect(cb.toJSON().default).toBe(false);
  });
});

describe('CheckboxGroupBuilder', () => {
  const opt1 = new CheckboxGroupOptionBuilder({ value: 'gaming', label: 'Gaming' });
  const opt2 = new CheckboxGroupOptionBuilder({ value: 'music', label: 'Music' });
  const opt3 = new CheckboxGroupOptionBuilder({ value: 'art', label: 'Art' });

  it('creates a group with options', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'hobbies',
      options: [opt1, opt2],
    });
    const json = group.toJSON();
    expect(json.type).toBe(22);
    expect(json.custom_id).toBe('hobbies');
    expect((json.options as unknown[]).length).toBe(2);
  });

  it('throws if options array is empty', () => {
    expect(() =>
      // @ts-expect-error
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [] as never,
      }),
    ).toThrow('options');
  });

  it('throws if options exceed 10', () => {
    const opts = Array.from({ length: 11 }, (_, i) =>
      new CheckboxGroupOptionBuilder({ value: `v${i}`, label: `L${i}` }),
    );
    expect(() =>
      // @ts-expect-error
      new CheckboxGroupBuilder({
        customId: 'x',
        options: opts as never,
      }),
    ).toThrow('options');
  });

  it('addOptions accumulates correctly', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'x',
      options: [opt1, opt2],
    });
    group.addOptions(opt3);
    expect((group.toJSON().options as unknown[]).length).toBe(3);
  });

  it('addOptions throws when exceeding 10', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'x',
      options: Array.from({ length: 10 }, (_, i) =>
        new CheckboxGroupOptionBuilder({ value: `v${i}`, label: `L${i}` }),
      ),
    });
    expect(() =>
      group.addOptions(
        new CheckboxGroupOptionBuilder({ value: 'overflow', label: 'Overflow' }),
      ),
    ).toThrow("can't be more than 10");
  });

  it('sets minValues and maxValues', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'x',
      options: [opt1, opt2],
      minValues: 1,
      maxValues: 2,
    });
    const json = group.toJSON();
    expect(json.min_values).toBe(1);
    expect(json.max_values).toBe(2);
  });

  it('throws if options array has less than 2 options', () => {
    expect(() =>
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1] as unknown as [CheckboxGroupOptionBuilder, CheckboxGroupOptionBuilder],
      }),
    ).toThrow('options');
  });

  it('allows zero minValues only when required is false', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'x',
      options: [opt1, opt2],
      required: false,
      minValues: 0,
    });
    expect(group.toJSON().required).toBe(false);
    expect(group.toJSON().min_values).toBe(0);
  });

  it('rejects zero minValues when required is omitted or true', () => {
    expect(() =>
      // @ts-expect-error
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1, opt2],
        minValues: 0,
      }),
    ).toThrow('required is false');
    expect(() =>
      // @ts-expect-error
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1, opt2],
        required: true,
        minValues: 0,
      }),
    ).toThrow('required is false');
  });

  it('spliceOptions works correctly', () => {
    const group = new CheckboxGroupBuilder({
      customId: 'x',
      options: [opt1, opt2, opt3],
    });
    group.spliceOptions(0, 1);
    expect((group.toJSON().options as unknown[]).length).toBe(2);
  });

  it('validates minValues and maxValues limits', () => {
    expect(() =>
      // @ts-expect-error
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1, opt2],
        minValues: 3,
        maxValues: 2,
      }),
    ).toThrow("minValues can't be more than maxValues");

    expect(() =>
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1, opt2],
        minValues: -1,
      }),
    ).toThrow('between 0 and 10');

    expect(() =>
      new CheckboxGroupBuilder({
        customId: 'x',
        options: [opt1, opt2],
        maxValues: 11,
      }),
    ).toThrow('between 1 and 10');
  });
});

describe('CheckboxGroupOptionBuilder', () => {
  it('creates an option with value and label', () => {
    const opt = new CheckboxGroupOptionBuilder({
      value: 'gaming',
      label: 'Gaming',
    });
    const json = opt.toJSON();
    expect(json.value).toBe('gaming');
    expect(json.label).toBe('Gaming');
  });

  it('throws if value exceeds 100 chars', () => {
    expect(() =>
      new CheckboxGroupOptionBuilder({
        value: 'a'.repeat(101),
        label: 'Test',
      }),
    ).toThrow('value is too long');
  });

  it('supports description and default', () => {
    const opt = new CheckboxGroupOptionBuilder({
      value: 'x',
      label: 'X',
      description: 'A description',
      default: true,
    });
    const json = opt.toJSON();
    expect(json.description).toBe('A description');
    expect(json.default).toBe(true);
  });
});

describe('CheckboxBuilder and CheckboxGroupBuilder extra methods', () => {
  it('supports setCustomId and static from() method', () => {
    const cb = new CheckboxBuilder({ customId: 'foo' });
    cb.setCustomId('bar');
    expect(cb.toJSON().custom_id).toBe('bar');

    const resolvedCb = CheckboxBuilder.from(cb.toJSON());
    expect(resolvedCb.customId).toBe('bar');

    const group = new CheckboxGroupBuilder({
      customId: 'g1',
      options: [
        new CheckboxGroupOptionBuilder({ value: 'v1', label: 'L1' }),
        new CheckboxGroupOptionBuilder({ value: 'v2', label: 'L2' }),
      ],
    });
    group.setCustomId('g2');
    expect(group.toJSON().custom_id).toBe('g2');

    const resolvedGroup = CheckboxGroupBuilder.from(group.toJSON());
    expect(resolvedGroup.customId).toBe('g2');
    expect(resolvedGroup.options.length).toBe(2);

    const opt = new CheckboxGroupOptionBuilder({ value: 'o1', label: 'Option' });
    const resolvedOpt = CheckboxGroupOptionBuilder.from(opt.toJSON());
    expect(resolvedOpt.value).toBe('o1');
  });
});
