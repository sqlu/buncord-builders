import { describe, expect, it } from 'bun:test';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, SectionBuilder,
  SmartLayoutBuilder, TextDisplayBuilder, ThumbnailBuilder,
  UserSelectMenuBuilder, TextInputBuilder, TextInputStyle,
} from '../src/index.ts';

const button = (id = 'button') => new ButtonBuilder({ customId: id, label: id, style: ButtonStyle.Primary });
const select = (id = 'select') => new UserSelectMenuBuilder({ customId: id });
const text = () => new TextDisplayBuilder({ content: 'Section text' });
const thumbnail = () => new ThumbnailBuilder({ url: 'https://example.com/image.png' });

describe('ActionRow runtime conformance', () => {
  it('rejects mixed buttons and selects in widened constructor arrays', () => {
    const components = [button(), select()];
    expect(() => new ActionRowBuilder({ components: components as never })).toThrow();
  });

  it('rejects every invalid child type at construction', () => {
    for (const type of [0, 1, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 99]) {
      expect(() => new ActionRowBuilder({ components: [{ type, toJSON: () => ({ type }) }] as never })).toThrow();
    }
  });

  it('rejects multiple selects and text inputs', () => {
    for (const type of [3, 4, 5, 6, 7, 8]) {
      const component = { type, toJSON: () => ({ type }) };
      expect(() => new ActionRowBuilder({ components: [component, component] as never })).toThrow();
    }
  });

  it('rejects invalid replacement and additions without mutating the row', () => {
    const row = new ActionRowBuilder({ components: [button()] });
    expect(() => row.setComponents([text()] as never)).toThrow();
    expect(() => row.addComponents(select() as never)).toThrow();
    expect(row.components).toHaveLength(1);
    expect(row.toJSON().components[0]!.type).toBe(2);
  });

  it('revalidates publicly exposed arrays when serializing', () => {
    const components = [button()];
    const row = new ActionRowBuilder({ components });
    (components as unknown[]).push(select());
    expect(() => row.toJSON()).toThrow();
    (row.data as Record<string, unknown>).components = Array.from({ length: 6 }, () => button());
    expect(() => row.toJSON()).toThrow();
  });

  it('preserves legacy modal rows with a single TextInput', () => {
    const input = new TextInputBuilder({ customId: 'input', label: 'Input', style: TextInputStyle.Short });
    expect(new ActionRowBuilder({ components: [input] }).toJSON().components[0]!.type).toBe(4);
  });
});

describe('Section runtime conformance', () => {
  it('requires an accessory at serialization while allowing staged construction', () => {
    const section = new SectionBuilder({ components: [text()] });
    expect(() => section.toJSON()).toThrow('accessory');
    section.setThumbnailAccessory(thumbnail());
    expect(section.toJSON().accessory!.type).toBe(11);
    section.clearAccessory();
    expect(() => section.toJSON()).toThrow('accessory');
  });

  it('revalidates section child count, child types, and accessory type on serialization', () => {
    const section = new SectionBuilder({ components: [text()], accessory: thumbnail() });
    (section.data as Record<string, unknown>).components = [text(), text(), text(), text()];
    expect(() => section.toJSON()).toThrow();
    (section.data as Record<string, unknown>).components = [button()];
    expect(() => section.toJSON()).toThrow('TextDisplay');
    (section.data as Record<string, unknown>).components = [text()];
    (section.data as Record<string, unknown>).accessory = text();
    expect(() => section.toJSON()).toThrow('accessory');
  });

  it('rejects invalid splice replacements without mutating existing children', () => {
    const section = new SectionBuilder({ components: [text()], accessory: thumbnail() });
    expect(() => section.spliceTextDisplayComponents(0, 1, button() as never)).toThrow('TextDisplay');
    expect(section.toJSON().components[0]!.type).toBe(10);
  });
});

describe('SmartLayout runtime conformance', () => {
  it('supports more than five rows in explicit componentsV2 mode', () => {
    const layout = new SmartLayoutBuilder({ mode: 'componentsV2' });
    for (let i = 0; i < 20; i++) layout.addSelectMenu(select(`select${i}`));
    expect(layout.build()).toHaveLength(20);
    expect(() => layout.addSelectMenu(select('overflow'))).toThrow('40');
    expect(layout.build()).toHaveLength(20);
  });

  it('counts packed rows toward the componentsV2 limit', () => {
    const layout = new SmartLayoutBuilder({ mode: 'componentsV2' });
    layout.addButtons(...Array.from({ length: 33 }, (_, i) => button(`button${i}`)));
    expect(layout.build()).toHaveLength(7);
    expect(() => layout.addButtons(button('overflow'))).toThrow('40');
    expect(layout.build().flatMap(row => row.components)).toHaveLength(33);
  });

  it('rejects legacy overflow while enqueueing and preserves its queue', () => {
    const layout = new SmartLayoutBuilder();
    for (let i = 0; i < 5; i++) layout.addSelectMenu(select(`select${i}`));
    expect(() => layout.addButtons(button())).toThrow('maximum of 5');
    expect(layout.build()).toHaveLength(5);
  });

  it('rejects wrong types for each enqueue method', () => {
    const layout = new SmartLayoutBuilder();
    expect(() => layout.addButtons(text() as never)).toThrow();
    expect(() => layout.addButtons(select() as never)).toThrow();
    expect(() => layout.addSelectMenu(button() as never)).toThrow();
    expect(() => layout.addSelectMenu({ type: 99 } as never)).toThrow();
    expect(layout.build()).toHaveLength(0);
  });

  it('rejects unknown modes supplied by JavaScript', () => {
    expect(() => new SmartLayoutBuilder({ mode: 'unknown' } as never)).toThrow('mode');
  });
});
