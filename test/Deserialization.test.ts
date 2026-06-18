import { describe, it, expect } from 'bun:test';
import {
  ComponentFactory,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  FileBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  LabelBuilder,
  FileUploadBuilder,
  RadioGroupBuilder,
  CheckboxGroupBuilder,
  CheckboxBuilder,
  ModalBuilder,
} from '../src/index.ts';

describe('Component Deserialization & Factory', () => {
  // Verifies that the factory correctly deserializes all component types
  it('should deserialize a Button (type 2)', () => {
    const rawButton = {
      type: 2,
      style: ButtonStyle.Primary,
      label: 'Click me',
      custom_id: 'btn_click',
      disabled: false,
    };
    const builder = ComponentFactory.from(rawButton) as ButtonBuilder;
    expect(builder instanceof ButtonBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawButton);
  });

  it('should deserialize a Link Button', () => {
    const rawLinkButton = {
      type: 2,
      style: ButtonStyle.Link,
      label: 'Google',
      url: 'https://google.com',
    };
    const builder = ComponentFactory.from(rawLinkButton) as ButtonBuilder;
    expect(builder.toJSON()).toEqual(rawLinkButton);
  });

  it('should deserialize an ActionRow (type 1) containing buttons', () => {
    const rawRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: ButtonStyle.Danger,
          label: 'Danger zone',
          custom_id: 'btn_danger',
        },
      ],
    };
    const builder = ComponentFactory.from(rawRow) as ActionRowBuilder;
    expect(builder instanceof ActionRowBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawRow);
  });

  it('should deserialize a StringSelectMenu (type 3)', () => {
    const rawSelect = {
      type: 3,
      custom_id: 'select_str',
      placeholder: 'Choose one',
      min_values: 1,
      max_values: 2,
      disabled: true,
      options: [
        {
          label: 'Option A',
          value: 'opt_a',
          description: 'First option',
          default: true,
        },
      ],
    };
    const builder = ComponentFactory.from(rawSelect) as StringSelectMenuBuilder;
    expect(builder instanceof StringSelectMenuBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawSelect);
  });

  it('should deserialize auto-populated select menus (types 5, 6, 7, 8)', () => {
    // User Select (type 5)
    const rawUser = {
      type: 5,
      custom_id: 'select_user',
      default_values: [{ id: '12345', type: 'user' }],
    };
    const builderUser = ComponentFactory.from(rawUser) as UserSelectMenuBuilder;
    expect(builderUser.toJSON()).toEqual(rawUser);

    // Role Select (type 6)
    const rawRole = {
      type: 6,
      custom_id: 'select_role',
      default_values: [{ id: '67890', type: 'role' }],
    };
    const builderRole = ComponentFactory.from(rawRole) as RoleSelectMenuBuilder;
    expect(builderRole.toJSON()).toEqual(rawRole);

    // Mentionable Select (type 7)
    const rawMention = {
      type: 7,
      custom_id: 'select_mention',
      default_values: [{ id: '11111', type: 'role' }],
    };
    const builderMention = ComponentFactory.from(rawMention) as MentionableSelectMenuBuilder;
    expect(builderMention.toJSON()).toEqual(rawMention);

    // Channel Select (type 8)
    const rawChannel = {
      type: 8,
      custom_id: 'select_channel',
      channel_types: [0, 2],
      default_values: [{ id: '22222', type: 'channel' }],
    };
    const builderChannel = ComponentFactory.from(rawChannel) as ChannelSelectMenuBuilder;
    expect(builderChannel.toJSON()).toEqual(rawChannel);
  });

  it('should deserialize a TextInput (type 4)', () => {
    const rawInput = {
      type: 4,
      custom_id: 'text_in',
      label: 'Enter text',
      style: TextInputStyle.Paragraph,
      min_length: 5,
      max_length: 100,
      placeholder: 'Type...',
      value: 'Pre-filled',
      required: true,
    };
    const builder = ComponentFactory.from(rawInput) as TextInputBuilder;
    expect(builder instanceof TextInputBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawInput);
  });

  it('should deserialize a Separator (type 14)', () => {
    const rawSep = {
      type: 14,
      divider: true,
      spacing: SeparatorSpacingSize.Large,
    };
    const builder = ComponentFactory.from(rawSep) as SeparatorBuilder;
    expect(builder instanceof SeparatorBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawSep);
  });

  it('should deserialize a File (type 13) and a Thumbnail (type 11)', () => {
    // File
    const rawFile = {
      type: 13,
      file: { url: 'attachment://cat.gif' },
      spoiler: true,
    };
    const builderFile = ComponentFactory.from(rawFile) as FileBuilder;
    expect(builderFile.toJSON()).toEqual(rawFile);

    // Thumbnail
    const rawThumb = {
      type: 11,
      media: { url: 'https://example.com/image.png' },
      description: 'Image',
      spoiler: false,
    };
    const builderThumb = ComponentFactory.from(rawThumb) as ThumbnailBuilder;
    expect(builderThumb.toJSON()).toEqual(rawThumb);
  });

  it('should deserialize a MediaGallery (type 12)', () => {
    const rawGallery = {
      type: 12,
      items: [
        {
          media: { url: 'https://example.com/pic1.jpg' },
          description: 'First image',
          spoiler: true,
        },
      ],
    };
    const builder = ComponentFactory.from(rawGallery) as MediaGalleryBuilder;
    expect(builder instanceof MediaGalleryBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawGallery);
  });

  it('should deserialize a Section (type 9)', () => {
    const rawSection = {
      type: 9,
      components: [
        {
          type: 10,
          content: 'Title info',
        },
      ],
      accessory: {
        type: 2,
        style: ButtonStyle.Secondary,
        label: 'Action',
        custom_id: 'sec_act',
      },
    };
    const builder = ComponentFactory.from(rawSection) as SectionBuilder;
    expect(builder instanceof SectionBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawSection);
  });

  it('should deserialize a Container (type 17)', () => {
    const rawContainer = {
      type: 17,
      accent_color: 16711680,
      spoiler: true,
      components: [
        {
          type: 10,
          content: 'Inside container',
        },
      ],
    };
    const builder = ComponentFactory.from(rawContainer) as ContainerBuilder;
    expect(builder instanceof ContainerBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawContainer);
  });

  it('should deserialize modal input components (types 18, 19, 21, 22, 23)', () => {
    // Checkbox (type 23)
    const rawCheckbox = {
      type: 23,
      custom_id: 'check_box',
      default: true,
    };
    const builderCheckbox = ComponentFactory.from(rawCheckbox) as CheckboxBuilder;
    expect(builderCheckbox.toJSON()).toEqual(rawCheckbox);

    // FileUpload (type 19)
    const rawUpload = {
      type: 19,
      custom_id: 'file_up',
      min_values: 1,
      max_values: 5,
      required: true,
    };
    const builderUpload = ComponentFactory.from(rawUpload) as FileUploadBuilder;
    expect(builderUpload.toJSON()).toEqual(rawUpload);

    // RadioGroup (type 21)
    const rawRadio = {
      type: 21,
      custom_id: 'radio_grp',
      required: true,
      options: [
        { value: 'opt_1', label: 'Option 1', description: 'Desc 1', default: true },
        { value: 'opt_2', label: 'Option 2' },
      ],
    };
    const builderRadio = ComponentFactory.from(rawRadio) as RadioGroupBuilder;
    expect(builderRadio.toJSON()).toEqual(rawRadio);

    // CheckboxGroup (type 22)
    const rawCheckGroup = {
      type: 22,
      custom_id: 'check_grp',
      min_values: 1,
      max_values: 3,
      required: false,
      options: [
        { value: 'chk_1', label: 'Check 1', default: false },
        { value: 'chk_2', label: 'Check 2' },
      ],
    };
    const builderCheckGroup = ComponentFactory.from(rawCheckGroup) as CheckboxGroupBuilder;
    expect(builderCheckGroup.toJSON()).toEqual(rawCheckGroup);

    // Label (type 18)
    const rawLabel = {
      type: 18,
      label: 'Field title',
      description: 'Instructional text',
      component: {
        type: 4,
        custom_id: 'field_input',
        label: 'Field label',
        style: TextInputStyle.Short,
      },
    };
    const builderLabel = ComponentFactory.from(rawLabel) as LabelBuilder;
    expect(builderLabel.toJSON()).toEqual(rawLabel);
  });

  it('should deserialize a Modal structure via from()', () => {
    const rawModal = {
      title: 'Modal Title',
      custom_id: 'modal_custom',
      components: [
        {
          type: 10,
          content: 'Simple description text display',
        },
      ],
    };
    const builder = ModalBuilder.from(rawModal);
    expect(builder instanceof ModalBuilder).toBe(true);
    expect(builder.toJSON()).toEqual(rawModal);
  });
});
