import { describe, test, expect } from 'bun:test';
import { ActionRowBuilder as DjsActionRowBuilder, ButtonBuilder as DjsButtonBuilder, StringSelectMenuBuilder as DjsStringSelectMenuBuilder } from '@discordjs/builders';
import { ButtonStyle as DjsButtonStyle } from 'discord-api-types/v10';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from '../src/index.ts';

describe('Performance Benchmarks', () => {
  test('Instantiation and Serialization comparison', () => {
    const ITERATIONS = 150000;

    // 1. @discordjs/builders - Instanciation seule
    const startDjsInst = performance.now();
    const djsRows: any[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const row = new DjsActionRowBuilder()
        .addComponents(
          new DjsButtonBuilder()
            .setCustomId(`btn_${i}`)
            .setLabel('Click me')
            .setStyle(DjsButtonStyle.Primary),
          new DjsStringSelectMenuBuilder()
            .setCustomId(`select_${i}`)
            .setPlaceholder('Choose something')
            .addOptions({
              label: 'Option 1',
              value: 'opt_1',
            })
        );
      djsRows.push(row);
    }
    const endDjsInst = performance.now();
    const timeDjsInst = endDjsInst - startDjsInst;

    // 2. @discordjs/builders - Sérialisation seule
    const startDjsSer = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      djsRows[i].toJSON();
    }
    const endDjsSer = performance.now();
    const timeDjsSer = endDjsSer - startDjsSer;

    // 3. @discordts/builders - Instanciation seule
    const startOursInst = performance.now();
    const ourRows: any[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const row = new ActionRowBuilder({
        components: [
          new ButtonBuilder({
            customId: `btn_${i}`,
            label: 'Click me',
            style: ButtonStyle.Primary,
          }),
          new StringSelectMenuBuilder({
            customId: `select_${i}`,
            placeholder: 'Choose something',
            options: [
              {
                label: 'Option 1',
                value: 'opt_1',
              },
            ],
          }),
        ],
      });
      ourRows.push(row);
    }
    const endOursInst = performance.now();
    const timeOursInst = endOursInst - startOursInst;

    // 4. @discordts/builders - Sérialisation seule
    const startOursSer = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      ourRows[i].toJSON();
    }
    const endOursSer = performance.now();
    const timeOursSer = endOursSer - startOursSer;

    console.log(`\n--- BENCHMARK RESULTS (${ITERATIONS} iterations) ---`);
    console.log(`[Instantiation] @discordjs/builders : ${timeDjsInst.toFixed(2)} ms`);
    console.log(`[Instantiation] @discordts/builders : ${timeOursInst.toFixed(2)} ms`);
    console.log(`Ratio Instantiation                 : ${(timeDjsInst / timeOursInst).toFixed(1)}x faster!`);
    console.log(`\n[Serialization] @discordjs/builders : ${timeDjsSer.toFixed(2)} ms`);
    console.log(`[Serialization] @discordts/builders : ${timeOursSer.toFixed(2)} ms`);
    console.log(`Ratio Serialization                 : ${(timeDjsSer / timeOursSer).toFixed(1)}x faster!`);
    console.log(`\n[Total] @discordjs/builders         : ${(timeDjsInst + timeDjsSer).toFixed(2)} ms`);
    console.log(`[Total] @discordts/builders         : ${(timeOursInst + timeOursSer).toFixed(2)} ms`);
    console.log(`Ratio Total                         : ${((timeDjsInst + timeDjsSer) / (timeOursInst + timeOursSer)).toFixed(1)}x faster!\n`);

    // Verify correctness: both builders must serialize to the same JSON structure
    expect(ourRows[0].toJSON().type).toBe(djsRows[0].toJSON().type);
    expect(ourRows[0].toJSON().components.length).toBe(djsRows[0].toJSON().components.length);
  });
});
