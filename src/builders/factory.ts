import { ComponentType } from '../enums.ts';
import { BaseComponent, resolveRaw } from './base.ts';
import { ActionRowBuilder } from './ActionRowBuilder.ts';
import { ButtonBuilder } from './ButtonBuilder.ts';
import { CheckboxBuilder } from './CheckboxBuilder.ts';
import { CheckboxGroupBuilder } from './CheckboxGroupBuilder.ts';
import { ContainerBuilder } from './ContainerBuilder.ts';
import { FileBuilder } from './FileBuilder.ts';
import { FileUploadBuilder } from './FileUploadBuilder.ts';
import { LabelBuilder } from './LabelBuilder.ts';
import { MediaGalleryBuilder } from './MediaGalleryBuilder.ts';
import { RadioGroupBuilder } from './RadioGroupBuilder.ts';
import { SectionBuilder } from './SectionBuilder.ts';
import { SeparatorBuilder } from './SeparatorBuilder.ts';
import { TextDisplayBuilder } from './TextDisplayBuilder.ts';
import { TextInputBuilder } from './TextInputBuilder.ts';
import { ThumbnailBuilder } from './ThumbnailBuilder.ts';
import {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
} from './SelectMenuBuilders.ts';

import type { APIComponent } from '../types.ts';

const registry = {
  [ComponentType.ActionRow]: ActionRowBuilder,
  [ComponentType.Button]: ButtonBuilder,
  [ComponentType.StringSelect]: StringSelectMenuBuilder,
  [ComponentType.TextInput]: TextInputBuilder,
  [ComponentType.UserSelect]: UserSelectMenuBuilder,
  [ComponentType.RoleSelect]: RoleSelectMenuBuilder,
  [ComponentType.MentionableSelect]: MentionableSelectMenuBuilder,
  [ComponentType.ChannelSelect]: ChannelSelectMenuBuilder,
  [ComponentType.Section]: SectionBuilder,
  [ComponentType.TextDisplay]: TextDisplayBuilder,
  [ComponentType.Thumbnail]: ThumbnailBuilder,
  [ComponentType.MediaGallery]: MediaGalleryBuilder,
  [ComponentType.File]: FileBuilder,
  [ComponentType.Separator]: SeparatorBuilder,
  [ComponentType.Container]: ContainerBuilder,
  [ComponentType.Label]: LabelBuilder,
  [ComponentType.FileUpload]: FileUploadBuilder,
  [ComponentType.RadioGroup]: RadioGroupBuilder,
  [ComponentType.CheckboxGroup]: CheckboxGroupBuilder,
  [ComponentType.Checkbox]: CheckboxBuilder,
} as unknown as Record<number, { from(data: unknown): BaseComponent }>;

/**
 * Creates component builders from raw API payloads.
 * Resolves component types and loads the right builder class.
 */
export class ComponentFactory {
  /** @internal */
  constructor() {}

  /**
   * Creates a component builder from a raw API payload.
   * @param data Raw component data.
   * @returns The builder instance.
   * @throws If payload is empty, has no type, or isn't supported.
   */
  public static from(data: APIComponent | Record<string, unknown>): BaseComponent {
    if (!data) throw new Error('data is null or undefined');
    const raw = resolveRaw(data);

    if (!raw || typeof raw.type !== 'number')
      throw new Error('missing component type in the payload');

    const ctor = registry[raw.type];
    if (!ctor) throw new Error(`unsupported component type: ${raw.type}`);

    return ctor.from(raw);
  }
}

BaseComponent.resolve = ComponentFactory.from;
