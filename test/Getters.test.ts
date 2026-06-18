import { describe, it, expect } from 'bun:test';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextInputBuilder,
  TextInputStyle,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from '../src/index.ts';

describe('Strict Type Getters', () => {
  it('verifies getters on ButtonBuilder', () => {
    const btn = new ButtonBuilder({
      customId: 'btn1',
      style: ButtonStyle.Primary,
      label: 'Button Label',
      disabled: true,
    });
    expect(btn.customId).toBe('btn1');
    expect(btn.style).toBe(ButtonStyle.Primary);
    expect(btn.label).toBe('Button Label');
    expect(btn.disabled).toBe(true);
  });

  it('verifies getters on ContainerBuilder', () => {
    const text = new TextDisplayBuilder({ content: 'Hello' });
    const container = new ContainerBuilder({
      components: [text],
      accentColor: [255, 0, 0],
      spoiler: true,
    });
    expect(container.components.length).toBe(1);
    expect(container.components[0]!.content).toBe('Hello');
    expect(container.accentColor).toBe(16711680);
    expect(container.spoiler).toBe(true);
  });

  it('verifies getters on SeparatorBuilder', () => {
    const sep = new SeparatorBuilder({
      divider: true,
      spacing: SeparatorSpacingSize.Large,
    });
    expect(sep.divider).toBe(true);
    expect(sep.spacing).toBe(SeparatorSpacingSize.Large);
  });

  it('verifies getters on ThumbnailBuilder', () => {
    const thumb = new ThumbnailBuilder({
      url: 'https://example.com/image.png',
      description: 'Alt Text',
      spoiler: true,
    });
    expect(thumb.url).toBe('https://example.com/image.png');
    expect(thumb.description).toBe('Alt Text');
    expect(thumb.spoiler).toBe(true);
  });

  it('verifies getters on FileBuilder', () => {
    const file = new FileBuilder({
      url: 'attachment://file.png',
      spoiler: true,
    });
    expect(file.url).toBe('attachment://file.png');
    expect(file.spoiler).toBe(true);
  });

  it('verifies getters on MediaGalleryBuilder', () => {
    const item = new MediaGalleryItemBuilder({
      url: 'https://example.com/pic.jpg',
      description: 'Alt Description',
    });
    const gallery = new MediaGalleryBuilder({
      items: [item],
    });
    expect(gallery.items.length).toBe(1);
    expect(gallery.items[0]!.url).toBe('https://example.com/pic.jpg');
    expect(gallery.items[0]!.description).toBe('Alt Description');
  });

  it('verifies getters on TextInputBuilder', () => {
    const input = new TextInputBuilder({
      customId: 'text_input',
      label: 'Input Label',
      style: TextInputStyle.Paragraph,
      placeholder: 'Type here...',
      value: 'Default Value',
      required: true,
    });
    expect(input.customId).toBe('text_input');
    expect(input.label).toBe('Input Label');
    expect(input.style).toBe(TextInputStyle.Paragraph);
    expect(input.placeholder).toBe('Type here...');
    expect(input.value).toBe('Default Value');
    expect(input.required).toBe(true);
  });

  it('verifies getters on CheckboxBuilder', () => {
    const checkbox = new CheckboxBuilder({
      customId: 'cb',
      default: true,
    });
    expect(checkbox.customId).toBe('cb');
    expect(checkbox.default).toBe(true);
  });

  it('verifies getters on CheckboxGroupBuilder', () => {
    const opt = new CheckboxGroupOptionBuilder({
      value: 'val1',
      label: 'Option 1',
      description: 'Desc 1',
      default: true,
    });
    const opt2 = new CheckboxGroupOptionBuilder({
      value: 'val2',
      label: 'Option 2',
    });
    const group = new CheckboxGroupBuilder({
      customId: 'cb_group',
      options: [opt, opt2],
      minValues: 1,
      maxValues: 3,
      required: true,
    });
    expect(group.customId).toBe('cb_group');
    expect(group.minValues).toBe(1);
    expect(group.maxValues).toBe(3);
    expect(group.required).toBe(true);
    expect(group.options.length).toBe(2);
    expect(group.options[0]!.value).toBe('val1');
    expect(group.options[0]!.label).toBe('Option 1');
    expect(group.options[0]!.description).toBe('Desc 1');
    expect(group.options[0]!.default).toBe(true);
  });

  it('verifies getters on RadioGroupBuilder', () => {
    const opt1 = new RadioGroupOptionBuilder({ value: 'v1', label: 'L1' });
    const opt2 = new RadioGroupOptionBuilder({ value: 'v2', label: 'L2' });
    const group = new RadioGroupBuilder({
      customId: 'radio',
      options: [opt1, opt2],
      required: true,
    });
    expect(group.customId).toBe('radio');
    expect(group.required).toBe(true);
    expect(group.options.length).toBe(2);
    expect(group.options[0]!.value).toBe('v1');
    expect(group.options[1]!.value).toBe('v2');
  });

  it('verifies getters on FileUploadBuilder', () => {
    const upload = new FileUploadBuilder({
      customId: 'file_upload',
      minValues: 1,
      maxValues: 5,
      required: true,
    });
    expect(upload.customId).toBe('file_upload');
    expect(upload.minValues).toBe(1);
    expect(upload.maxValues).toBe(5);
    expect(upload.required).toBe(true);
  });

  it('verifies getters on LabelBuilder', () => {
    const input = new TextInputBuilder({ customId: 'input', label: 'Input' });
    const label = new LabelBuilder({
      label: 'Field Label',
      component: input,
      description: 'Field Description',
    });
    expect(label.label).toBe('Field Label');
    expect(label.description).toBe('Field Description');
    expect(label.component?.customId).toBe('input');
  });

  it('verifies getters on ModalBuilder', () => {
    const display = new TextDisplayBuilder({ content: 'Markdown info' });
    const modal = new ModalBuilder({
      title: 'Modal Title',
      customId: 'modal_id',
      components: [display],
    });
    expect(modal.title).toBe('Modal Title');
    expect(modal.customId).toBe('modal_id');
    expect(modal.components.length).toBe(1);
    expect(modal.components[0]!.content).toBe('Markdown info');
  });

  it('verifies getters on SelectMenuBuilders', () => {
    const stringMenu = new StringSelectMenuBuilder({
      customId: 'str_menu',
      placeholder: 'Select one',
      minValues: 1,
      maxValues: 2,
      disabled: true,
      options: [{ label: 'Opt 1', value: 'opt1' }],
    });
    expect(stringMenu.customId).toBe('str_menu');
    expect(stringMenu.placeholder).toBe('Select one');
    expect(stringMenu.minValues).toBe(1);
    expect(stringMenu.maxValues).toBe(2);
    expect(stringMenu.disabled).toBe(true);
    expect(stringMenu.options.length).toBe(1);

    const userMenu = new UserSelectMenuBuilder({
      customId: 'user_menu',
    });
    expect(userMenu.defaultValues.length).toBe(0);
    userMenu.addDefaultUsers('123456789012345678');
    expect(userMenu.defaultValues.length).toBe(1);
    expect(userMenu.defaultValues[0]!.id).toBe('123456789012345678');
  });
});
