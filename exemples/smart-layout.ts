/**
 * @file smart-layout.ts
 * @description SmartLayoutBuilder automatically packs buttons into valid rows
 * (up to 5 per row) and keeps select menus on dedicated rows.
 *
 * Run with:  bun run exemples/smart-layout.ts
 *
 * @see {@link https://docs.discord.com/developers/components/reference#action-row}
 */

import {
  ButtonBuilder,
  ButtonStyle,
  SmartLayoutBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} from '../src/index.ts';

const rows = new SmartLayoutBuilder()
  .addButtons(
    new ButtonBuilder({ customId: 'page:prev', style: ButtonStyle.Secondary, label: 'Previous' }),
    new ButtonBuilder({ customId: 'page:next', style: ButtonStyle.Primary, label: 'Next' }),
  )
  .addSelectMenu(
    new StringSelectMenuBuilder({
      customId: 'page:section',
      placeholder: 'Jump to section',
      options: [
        { label: 'Overview', value: 'overview' },
        { label: 'Details', value: 'details' },
        { label: 'Settings', value: 'settings' },
      ],
    }),
  )
  .addButtons(
    new ButtonBuilder({ customId: 'page:refresh', style: ButtonStyle.Secondary, label: 'Refresh' }),
  )
  .build();

// rows -> [ActionRow[prev, next], ActionRow[select], ActionRow[refresh]]
console.log(`Generated ${rows.length} action row(s):`);
for (const row of rows) {
  console.log(`  ActionRow with component types: [${row.toJSON().components.map((c) => c.type).join(', ')}]`);
}

const payload = {
  flags: MessageFlags.IsComponentsV2,
  components: [...rows],
};

console.log('\nFull payload:', JSON.stringify(payload, null, 2));
