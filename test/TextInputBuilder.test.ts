import { describe, it, expect } from 'bun:test';
import { TextInputBuilder, TextInputStyle } from '../src/index.ts';

describe('TextInputBuilder', () => {
  it('creates a valid short text input', () => {
    const input = new TextInputBuilder({
      customId: 'username',
      label: 'Username',
      style: TextInputStyle.Short,
    });
    const json = input.toJSON();
    expect(json.type).toBe(4);
    expect(json.custom_id).toBe('username');
    expect(json.label).toBe('Username');
    expect(json.style).toBe(1);
  });

  it('accepts custom_id alias', () => {
    const input = new TextInputBuilder({
      custom_id: 'alias_test',
      label: 'Test',
    });
    expect(input.toJSON().custom_id).toBe('alias_test');
  });

  it('supports modern label-wrapped text inputs without inline label', () => {
    const input = new TextInputBuilder({
      customId: 'modern_input',
      style: TextInputStyle.Paragraph,
    });
    const json = input.toJSON();
    expect(json.custom_id).toBe('modern_input');
    expect(json.style).toBe(TextInputStyle.Paragraph);
    expect(json.label).toBeUndefined();
  });

  it('sets min and max length', () => {
    const input = new TextInputBuilder({
      customId: 'bio',
      label: 'Bio',
      minLength: 10,
      maxLength: 500,
    });
    const json = input.toJSON();
    expect(json.min_length).toBe(10);
    expect(json.max_length).toBe(500);
  });

  it('throws if customId is missing', () => {
    expect(() =>
      new TextInputBuilder({ label: 'Test' } as never),
    ).toThrow('customId is required');
  });

  it('throws if label exceeds 45 chars at runtime', () => {
    expect(() =>
      new TextInputBuilder({
        customId: 'x',
        label: 'a'.repeat(46),
      }),
    ).toThrow('label is too long');
  });

  it('throws if customId exceeds 100 chars', () => {
    expect(() =>
      new TextInputBuilder({
        customId: 'a'.repeat(101),
        label: 'Test',
      }),
    ).toThrow('customId is too long');
  });

  it('throws if customId is cleared to an empty string', () => {
    const input = new TextInputBuilder({ customId: 'x' });
    expect(() => input.setCustomId('')).toThrow('at least 1');
  });

  it('throws if minLength > maxLength', () => {
    expect(() =>
      // @ts-expect-error
      new TextInputBuilder({
        customId: 'x',
        label: 'Test',
        minLength: 100,
        maxLength: 50,
      }),
    ).toThrow('min length');
  });

  it('throws if value is shorter than minLength', () => {
    expect(() =>
      new TextInputBuilder({
        customId: 'x',
        label: 'Test',
        minLength: 10,
        value: 'short',
      }),
    ).toThrow('value is too short');
  });

  it('throws if value exceeds maxLength', () => {
    expect(() =>
      new TextInputBuilder({
        customId: 'x',
        label: 'Test',
        maxLength: 5,
        value: 'toolong',
      }),
    ).toThrow('value is too long');
  });

  it('setMinLength rejects values > 4000', () => {
    const input = new TextInputBuilder({ customId: 'x', label: 'Test' });
    expect(() => input.setMinLength(4001)).toThrow('minLength');
  });

  it('setMaxLength rejects values < 1', () => {
    const input = new TextInputBuilder({ customId: 'x', label: 'Test' });
    expect(() => input.setMaxLength(0)).toThrow('maxLength');
  });

  it('supports fluent chaining', () => {
    const input = new TextInputBuilder({
      customId: 'email',
      label: 'Email',
    })
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('you@example.com')
      .setRequired(true);

    const json = input.toJSON();
    expect(json.placeholder).toBe('you@example.com');
    expect(json.required).toBe(true);
  });


  it('setId / clearId work', () => {
    const input = new TextInputBuilder({ customId: 'x', label: 'Test' });
    input.setId(42);
    expect(input.toJSON().id).toBe(42);
    input.clearId();
    expect(input.toJSON().id).toBeUndefined();
  });
});
