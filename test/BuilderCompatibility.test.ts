import { expect, it } from 'bun:test';
import {
  ActionRowBuilder as DiscordActionRowBuilder,
  ButtonBuilder as DiscordButtonBuilder,
  StringSelectMenuBuilder as DiscordStringSelectMenuBuilder,
} from '@discordjs/builders';
import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from '../src/index.ts';

it('serializes valid button and select rows to the complete Discord wire payload', () => {
  const ours = [
    new ActionRowBuilder({ components: [new ButtonBuilder({ customId: 'confirm', label: 'Confirm', style: 1 })] }),
    new ActionRowBuilder({ components: [new StringSelectMenuBuilder({ customId: 'choice', options: [{ label: 'A', value: 'a' }] })] }),
  ];
  const discord = [
    new DiscordActionRowBuilder().addComponents(new DiscordButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(1)),
    new DiscordActionRowBuilder().addComponents(new DiscordStringSelectMenuBuilder().setCustomId('choice').addOptions({ label: 'A', value: 'a' })),
  ];
  const expected = [
    { type: 1, components: [{ type: 2, style: 1, custom_id: 'confirm', label: 'Confirm' }] },
    { type: 1, components: [{ type: 3, custom_id: 'choice', options: [{ label: 'A', value: 'a' }] }] },
  ];
  expect(JSON.parse(JSON.stringify(ours))).toEqual(expected);
  expect(JSON.parse(JSON.stringify(discord))).toEqual(expected);
});
