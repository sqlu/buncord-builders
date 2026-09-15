/**
 * @file quick-start.ts
 * @description Minimal example showing a full Components V2 message payload.
 *
 * Run with:  bun run exemples/quick-start.ts
 *
 * @see {@link https://docs.discord.com/developers/components/reference}
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from '../src/index.ts';

const container = new ContainerBuilder()
  .addComponents(
    new TextDisplayBuilder({
      content: '# Release notes\nComponents V2, built with type-safe builders.',
    }),
    new SeparatorBuilder({
      divider: true,
      spacing: SeparatorSpacingSize.Small,
    }),
    new ActionRowBuilder({
      components: [
        new ButtonBuilder({
          customId: 'release:ack',
          style: ButtonStyle.Success,
          label: 'Acknowledge',
        }),
        new ButtonBuilder({
          style: ButtonStyle.Link,
          url: 'https://docs.discord.com/developers/components/reference',
          label: 'Discord docs',
        }),
      ],
    }),
  );

const payload = {
  flags: MessageFlags.IsComponentsV2,
  components: [container.toJSON()],
};

console.log(JSON.stringify(payload, null, 2));
