import { describe, it, expect } from 'bun:test';
import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
} from '../src/index.ts';

describe('StringSelectMenuBuilder', () => {
  const opt1 = new StringSelectMenuOptionBuilder({ label: 'Cat', value: 'cat' });
  const opt2 = new StringSelectMenuOptionBuilder({ label: 'Dog', value: 'dog' });

  it('creates a string select menu', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'animal',
      options: [opt1, opt2],
    });
    const json = menu.toJSON();
    expect(json.type).toBe(3);
    expect(json.custom_id).toBe('animal');
    expect((json.options as unknown[]).length).toBe(2);
  });

  it('sets placeholder', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'x',
      options: [opt1],
      placeholder: 'Choose an animal',
    });
    expect(menu.toJSON().placeholder).toBe('Choose an animal');
  });

  it('throws if placeholder exceeds 150 chars', () => {
    expect(() =>
      new StringSelectMenuBuilder({
        customId: 'x',
        options: [opt1],
        placeholder: 'a'.repeat(151),
      }),
    ).toThrow('placeholder is too long');
  });

  it('throws if options is empty', () => {
    expect(() =>
      // @ts-expect-error
      new StringSelectMenuBuilder({
        customId: 'x',
        options: [] as never,
      }),
    ).toThrow('options');
  });

  it('throws if options exceed 25', () => {
    const opts = Array.from({ length: 26 }, (_, i) =>
      new StringSelectMenuOptionBuilder({ label: `L${i}`, value: `v${i}` }),
    );
    expect(() =>
      // @ts-expect-error
      new StringSelectMenuBuilder({ customId: 'x', options: opts as never }),
    ).toThrow('options');
  });

  it('addOptions accumulates', () => {
    const menu = new StringSelectMenuBuilder({ customId: 'x', options: [opt1] });
    menu.addOptions(opt2);
    expect((menu.toJSON().options as unknown[]).length).toBe(2);
  });

  it('validates minValues/maxValues cross-field', () => {
    expect(() =>
      // @ts-expect-error
      new StringSelectMenuBuilder({
        customId: 'x',
        options: [opt1],
        minValues: 5,
        maxValues: 2,
      }),
    ).toThrow('minValues');
  });

  it('spliceOptions works', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'x',
      options: [opt1, opt2],
    });
    menu.spliceOptions(0, 1);
    expect((menu.toJSON().options as unknown[]).length).toBe(1);
  });

  it('setDisabled works', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'x',
      options: [opt1],
    });
    menu.setDisabled(true);
    expect(menu.toJSON().disabled).toBe(true);
  });

  it('supports modal required fields and optional minValues', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'x',
      options: [opt1],
      required: false,
      minValues: 0,
    });
    const json = menu.toJSON();
    expect(json.required).toBe(false);
    expect(json.min_values).toBe(0);
  });

  it('rejects minValues 0 unless the modal field is optional', () => {
    expect(() =>
      // @ts-expect-error
      new StringSelectMenuBuilder({
        customId: 'x',
        options: [opt1],
        minValues: 0,
      }),
    ).toThrow('required is false');
  });
});

describe('StringSelectMenuOptionBuilder', () => {
  it('creates a basic option', () => {
    const opt = new StringSelectMenuOptionBuilder({ label: 'Cat', value: 'cat' });
    const json = opt.toJSON();
    expect(json.label).toBe('Cat');
    expect(json.value).toBe('cat');
  });

  it('supports emoji, description, and default', () => {
    const opt = new StringSelectMenuOptionBuilder({ label: 'Cat', value: 'cat' })
      .setEmoji({ name: '🐱' })
      .setDescription('A fluffy animal')
      .setDefault(true);
    const json = opt.toJSON();
    expect(json.emoji).toEqual({ name: '🐱' });
    expect(json.description).toBe('A fluffy animal');
    expect(json.default).toBe(true);
  });
});

describe('UserSelectMenuBuilder', () => {
  it('creates a user select menu', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'user_pick' });
    const json = menu.toJSON();
    expect(json.type).toBe(5);
    expect(json.custom_id).toBe('user_pick');
  });

  it('setDefaultUsers works', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x' });
    menu.setDefaultUsers(['123456789']);
    const json = menu.toJSON();
    const defaults = json.default_values as { id: string; type: string }[];
    expect(defaults[0]?.id).toBe('123456789');
    expect(defaults[0]?.type).toBe('user');
  });
});

describe('RoleSelectMenuBuilder', () => {
  it('creates a role select menu', () => {
    const menu = new RoleSelectMenuBuilder({ customId: 'role_pick' });
    expect(menu.toJSON().type).toBe(6);
  });

  it('setDefaultRoles works', () => {
    const menu = new RoleSelectMenuBuilder({ customId: 'x' });
    menu.setDefaultRoles(['999888777']);
    const json = menu.toJSON();
    const defaults = json.default_values as { id: string; type: string }[];
    expect(defaults[0]?.type).toBe('role');
  });
});

describe('MentionableSelectMenuBuilder', () => {
  it('creates a mentionable select menu', () => {
    const menu = new MentionableSelectMenuBuilder({ customId: 'mention' });
    expect(menu.toJSON().type).toBe(7);
  });

  it('addDefaultUsers and addDefaultRoles work together', () => {
    const menu = new MentionableSelectMenuBuilder({ customId: 'x' });
    menu.addDefaultUsers('111').addDefaultRoles('222');
    const defaults = menu.toJSON().default_values as { type: string }[];
    expect(defaults.some((d) => d.type === 'user')).toBe(true);
    expect(defaults.some((d) => d.type === 'role')).toBe(true);
  });
});

describe('ChannelSelectMenuBuilder', () => {
  it('creates a channel select menu', () => {
    const menu = new ChannelSelectMenuBuilder({ customId: 'channel' });
    expect(menu.toJSON().type).toBe(8);
  });

  it('setChannelTypes filters channels', () => {
    const menu = new ChannelSelectMenuBuilder({
      customId: 'x',
      channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice],
    });
    const types = menu.toJSON().channel_types as number[];
    expect(types).toContain(0); // GuildText
    expect(types).toContain(2); // GuildVoice
  });

  it('setDefaultChannels works', () => {
    const menu = new ChannelSelectMenuBuilder({ customId: 'x' });
    menu.setDefaultChannels(['123']);
    const defaults = menu.toJSON().default_values as { type: string }[];
    expect(defaults[0]?.type).toBe('channel');
  });
});

describe('Select Menu Default Values Validation', () => {
  it('throws on UserSelectMenu with invalid default type', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x' });
    expect(() => (menu as unknown as { addDefaultValuesRaw(arr: unknown[]): void }).addDefaultValuesRaw([{ id: '123', type: 'channel' }])).toThrow('invalid');
  });

  it('throws when default values exceed maxValues', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x', maxValues: 2 });
    expect(() => menu.setDefaultUsers(['1', '2', '3'])).toThrow('exceeds maxValues');
  });

  it('throws when default values are less than minValues', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x', minValues: 2 });
    expect(() => menu.setDefaultUsers(['1'])).toThrow('less than minValues');
  });

  it('throws when setting minValues makes existing defaults invalid', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x' });
    menu.setDefaultUsers(['1']);
    expect(() => menu.setMinValues(2)).toThrow('less than minValues');
  });

  it('throws when setting maxValues makes existing defaults invalid', () => {
    const menu = new UserSelectMenuBuilder({ customId: 'x' });
    menu.setDefaultUsers(['1', '2', '3']);
    expect(() => menu.setMaxValues(2)).toThrow('exceeds maxValues');
  });
});

describe('Select Menu Modal Validation', () => {
  it('throws if disabled is set on a select menu inside a Label', () => {
    const menu = new StringSelectMenuBuilder({
      customId: 'modal_select',
      options: [{ label: 'Opt 1', value: 'opt1' }],
      disabled: true,
    });
    const label = new LabelBuilder({ label: 'Pick one', component: menu });
    expect(() => label.toJSON()).toThrow('disabled cannot be set');
  });
});
