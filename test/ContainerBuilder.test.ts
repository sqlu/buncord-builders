import { describe, it, expect } from 'bun:test';
import {
  ContainerBuilder,
  ActionRowBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
} from '../src/index.ts';

describe('ContainerBuilder', () => {
  it('should add typed components correctly', () => {
    const container = new ContainerBuilder();

    // Add action row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder({ customId: 'btn', style: ButtonStyle.Primary, label: 'Click' })
    );
    container.addActionRowComponents(row);
    expect(container.components.length).toBe(1);

    // Add file
    const file = new FileBuilder({ url: 'attachment://test.png' });
    container.addFileComponents(file);
    expect(container.components.length).toBe(2);

    // Add media gallery
    const item = new MediaGalleryItemBuilder({ url: 'https://example.com/test.png' });
    const gallery = new MediaGalleryBuilder({ items: [item] });
    container.addMediaGalleryComponents(gallery);
    expect(container.components.length).toBe(3);

    // Add section
    const section = new SectionBuilder({
      components: [new TextDisplayBuilder({ content: 'Section text' })],
    });
    container.addSectionComponents(section);
    expect(container.components.length).toBe(4);

    // Add separator
    const sep = new SeparatorBuilder();
    container.addSeparatorComponents(sep);
    expect(container.components.length).toBe(5);

    // Add text display
    const text = new TextDisplayBuilder({ content: 'Yo' });
    container.addTextDisplayComponents(text);
    expect(container.components.length).toBe(6);
  });

  // Verifies splicing components
  it('should support splicing components', () => {
    const container = new ContainerBuilder({
      components: [
        new TextDisplayBuilder({ content: '1' }),
        new TextDisplayBuilder({ content: '2' }),
      ]
    });

    // remove one component
    container.spliceComponents(0, 1, new TextDisplayBuilder({ content: '3' }));
    const payload = container.toJSON();
    expect((payload.components as unknown[]).length).toBe(2);
    expect((payload.components as unknown as Record<string, unknown>[])[0]!.content).toBe('3');
    expect((payload.components as unknown as Record<string, unknown>[])[1]!.content).toBe('2');
  });
});
