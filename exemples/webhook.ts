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

const url = "webhook"

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

const pd = {
  flags: MessageFlags.IsComponentsV2,
  components: [container],
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(pd),
});

if (!res.ok) {
  const err = await res.text();
  console.error(err);
  process.exit(1);
}
