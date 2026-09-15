/**
 * @file webhook.ts
 * @description Posts a Components V2 message to a Discord webhook.
 *
 * Run with:  DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..." bun run exemples/webhook.ts
 *
 * @see {@link https://docs.discord.com/developers/resources/webhook#execute-webhook}
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

const url = process.env.DISCORD_WEBHOOK_URL;
if (!url) {
  console.error('Set DISCORD_WEBHOOK_URL to the webhook you want to post to.');
  process.exit(1);
}

const container = new ContainerBuilder()
  .addComponents(
    new TextDisplayBuilder({
      content: '# Hello from @buncord/builders!',
    }),
    new SeparatorBuilder({
      divider: true,
      spacing: SeparatorSpacingSize.Small,
    }),
    new ActionRowBuilder({
      components: [
        new ButtonBuilder({
          style: ButtonStyle.Link,
          url: 'https://github.com/sqlu/buncord-builders',
          label: "Star Snayz's repository on GitHub",
          emoji: { name: "⭐" },
        }),
      ],
    }),
  );

// The IS_COMPONENTS_V2 flag is required for Container and its children.
const payload = {
  flags: MessageFlags.IsComponentsV2,
  components: [container.toJSON()],
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  console.error(`Discord rejected the payload (${res.status}):`, await res.text());
  process.exit(1);
}

console.log('Message sent.');
