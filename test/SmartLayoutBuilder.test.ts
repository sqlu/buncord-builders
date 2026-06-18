import { describe, it, expect } from 'bun:test';
import {
  SmartLayoutBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from '../src/index.ts';

const makeBtn = (id: string) =>
  new ButtonBuilder({
    customId: id,
    style: ButtonStyle.Primary,
    label: id,
  });

const makeSelect = (id: string) =>
  new StringSelectMenuBuilder({
    customId: id,
    options: [
      new StringSelectMenuOptionBuilder({ label: 'Opt', value: 'opt' }),
    ],
  });

describe('SmartLayoutBuilder', () => {
  it('packs buttons into a single row', () => {
    const rows = new SmartLayoutBuilder()
      .addButtons(makeBtn('a'), makeBtn('b'), makeBtn('c'))
      .build();

    expect(rows.length).toBe(1);
    const json = rows[0]!.toJSON();
    expect((json.components as unknown[]).length).toBe(3);
  });

  it('splits buttons into multiple rows at 5 per row', () => {
    const rows = new SmartLayoutBuilder()
      .addButtons(
        makeBtn('a'),
        makeBtn('b'),
        makeBtn('c'),
        makeBtn('d'),
        makeBtn('e'),
        makeBtn('f'),
      )
      .build();

    expect(rows.length).toBe(2);
    expect((rows[0]!.toJSON().components as unknown[]).length).toBe(5);
    expect((rows[1]!.toJSON().components as unknown[]).length).toBe(1);
  });

  it('gives select menus their own row', () => {
    const rows = new SmartLayoutBuilder()
      .addButtons(makeBtn('a'), makeBtn('b'))
      .addSelectMenu(makeSelect('sel'))
      .build();

    expect(rows.length).toBe(2);
    const selRow = rows[1]!.toJSON();
    expect((selRow.components as { type: number }[])[0]!.type).toBe(3);
  });

  it('flushes pending button row before a select menu', () => {
    const rows = new SmartLayoutBuilder()
      .addButtons(makeBtn('x'))
      .addSelectMenu(makeSelect('s'))
      .addButtons(makeBtn('y'))
      .build();

    // btn row, select row, btn row
    expect(rows.length).toBe(3);
  });

  it('throws if output exceeds 5 rows', () => {
    const builder = new SmartLayoutBuilder();
    // 5 select menus = 5 rows, then 1 button overflows
    for (let i = 0; i < 5; i++) {
      builder.addSelectMenu(makeSelect(`sel${i}`));
    }
    builder.addButtons(makeBtn('extra'));

    expect(() => builder.build()).toThrow('maximum of 5');
  });

  it('returns empty array when nothing added', () => {
    const rows = new SmartLayoutBuilder().build();
    expect(rows.length).toBe(0);
  });
});
