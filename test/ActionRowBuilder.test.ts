import { describe, it, expect } from 'bun:test';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from '../src/index.ts';

describe('ActionRowBuilder', () => {
  const btn1 = new ButtonBuilder({
    customId: 'b1',
    style: ButtonStyle.Primary,
    label: 'B1',
  });
  const btn2 = new ButtonBuilder({
    customId: 'b2',
    style: ButtonStyle.Secondary,
    label: 'B2',
  });

  it('allows composing an empty action row before serialization', () => {
    const row = new ActionRowBuilder();
    expect(row.components.length).toBe(0);
    expect(() => row.toJSON()).toThrow('need at least one component to serialize');
  });

  it('adds buttons up to 5', () => {
    const row = new ActionRowBuilder({
      components: [btn1, btn2],
    });
    expect((row.toJSON().components as unknown[]).length).toBe(2);
  });

  it('throws if more than 5 components at construction', () => {
    const buttons = Array.from({ length: 6 }, (_, i) =>
      new ButtonBuilder({
        customId: `b${i}`,
        style: ButtonStyle.Primary,
        label: `B${i}`,
      }),
    );
    expect(() =>
      new ActionRowBuilder({ components: buttons as never }),
    ).toThrow("components size can't exceed 5");
  });

  it('addComponents throws when exceeding 5', () => {
    const row = new ActionRowBuilder();
    for (let i = 0; i < 5; i++) {
      row.addComponents(
        new ButtonBuilder({
          customId: `b${i}`,
          style: ButtonStyle.Primary,
          label: `B${i}`,
        }),
      );
    }
    expect(() =>
      row.addComponents(
        new ButtonBuilder({
          customId: 'overflow',
          style: ButtonStyle.Danger,
          label: 'Over',
        }),
      ),
    ).toThrow("components size can't exceed 5");
  });

  it('setComponents replaces correctly', () => {
    const row = new ActionRowBuilder({ components: [btn1] });
    row.setComponents([btn2]);
    const json = row.toJSON();
    const comps = json.components as { custom_id?: string }[];
    expect(comps[0]?.custom_id).toBe('b2');
  });

  it('setId works', () => {
    const row = new ActionRowBuilder({ components: [btn1] });
    row.setId(99);
    expect(row.toJSON().id).toBe(99);
  });
});

describe('ContainerBuilder', () => {
  const text = new TextDisplayBuilder({ content: '**Hello**' });
  const sep = new SeparatorBuilder({ divider: true });

  it('creates a container', () => {
    const container = new ContainerBuilder({
      components: [text],
    });
    const json = container.toJSON();
    expect(json.type).toBe(17);
    expect((json.components as unknown[]).length).toBe(1);
  });

  it('sets accent color from RGB tuple', () => {
    const container = new ContainerBuilder()
      .setAccentColor([88, 101, 242])
      .addTextDisplayComponents(text);
    // 88<<16 + 101<<8 + 242 = 5793266
    expect(container.toJSON().accent_color).toBe(5793266);
  });

  it('sets accent color from integer', () => {
    const container = new ContainerBuilder()
      .setAccentColor(0xff0000)
      .addTextDisplayComponents(text);
    expect(container.toJSON().accent_color).toBe(0xff0000);
  });

  it('throws on invalid RGB values', () => {
    expect(() =>
      new ContainerBuilder().setAccentColor([256, 0, 0]),
    ).toThrow('RGB values');
  });

  it('throws on negative RGB values', () => {
    expect(() =>
      new ContainerBuilder().setAccentColor([0, -1, 0]),
    ).toThrow('RGB values');
  });

  it('throws on invalid integer accent colors', () => {
    expect(() => new ContainerBuilder().setAccentColor(0x1000000)).toThrow('accent color');
    expect(() => new ContainerBuilder().setAccentColor(-1)).toThrow('accent color');
  });

  it('does not serialize an empty container', () => {
    expect(() => new ContainerBuilder().toJSON()).toThrow('need at least one component to serialize');
  });

  it('addComponents typed helpers work', () => {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(text)
      .addSeparatorComponents(sep);
    expect((container.toJSON().components as unknown[]).length).toBe(2);
  });

  it('throws if more than 10 components', () => {
    const container = new ContainerBuilder();
    const texts = Array.from(
      { length: 10 },
      (_, i) => new TextDisplayBuilder({ content: `T${i}` }),
    );
    container.addTextDisplayComponents(...texts);
    expect(() =>
      container.addTextDisplayComponents(
        new TextDisplayBuilder({ content: 'overflow' }),
      ),
    ).toThrow("components size can't exceed 10");
  });

  it('clearAccentColor works', () => {
    const container = new ContainerBuilder()
      .setAccentColor([255, 0, 0])
      .addTextDisplayComponents(text)
      .clearAccentColor();
    expect(container.toJSON().accent_color).toBeUndefined();
  });

  it('sets spoiler', () => {
    const container = new ContainerBuilder({
      components: [text],
      spoiler: true,
    });
    expect(container.toJSON().spoiler).toBe(true);
  });
});
