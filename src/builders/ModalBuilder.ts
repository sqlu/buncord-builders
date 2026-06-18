import type { CheckArrayLength, CheckMaxLength, WithId } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';
import type { LabelBuilder } from './LabelBuilder.ts';
import type { TextDisplayBuilder } from './TextDisplayBuilder.ts';
import type { ActionRowBuilder } from './ActionRowBuilder.ts';
import type { APIModalStructure, APIModalComponent } from '../types.ts';

export type ModalComponent = LabelBuilder | TextDisplayBuilder | ActionRowBuilder;

export interface BaseModalOptions<
  Title extends string = string,
  Components extends readonly ModalComponent[] = ModalComponent[],
> {
  /**
   * The title displayed at the top of the modal (maximum of 45 characters).
   */
  title: Title & CheckMaxLength<Title, 45, 'Title'>;
  /**
   * The child components inside this modal (between 1 and 5 components).
   */
  components?: Components & CheckArrayLength<Components, 1, 5, 'components'>;
}


export type ModalOptions<
  Title extends string = string,
  CustomId extends string = string,
  Components extends readonly ModalComponent[] = ModalComponent[],
> = WithId<CustomId> & BaseModalOptions<Title, Components>;

export interface ModalBuilderInstance<
  CustomId extends string,
  Components extends readonly ModalComponent[] = readonly ModalComponent[],
> extends ModalBuilderClass {
  readonly customId: CustomId;
  readonly components: Components;
}

/**
 * Builds a Modal structure: a popup form shown to users in response to interactions.
 * Contains between 1 and 5 top-level components: {@link LabelBuilder},
 * {@link TextDisplayBuilder}, or legacy {@link ActionRowBuilder}.
 *
 * Modals are triggered by interaction responses and cannot be sent as regular messages.
 *
 * @example
 * ```ts
 * const modal = new ModalBuilder({
 *   customId: 'profile',
 *   title: 'Discord Profile Settings',
 *   components: [
 *     new LabelBuilder({
 *       label: 'Bio',
 *       component: new TextInputBuilder({ customId: 'bio', style: TextInputStyle.Paragraph }),
 *     }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-modal Discord Docs - Modal}
 */
class ModalBuilderClass {
  public readonly data: {
    title?: string;
    custom_id?: string;
    components?: ModalComponent[];
  } = {};

  /**
   * Recreates a ModalBuilder from a raw API payload.
   * @param data Raw modal data payload
   * @returns A new ModalBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIModalStructure): ModalBuilderClass {
    const raw = resolveRaw(data) as unknown as APIModalStructure;
    const rawComps = raw.components ?? [];
    const len = rawComps.length;
    const comps = new Array(len);
    for (let i = 0; i < len; i++) {
      comps[i] = BaseComponent.resolve!(rawComps[i]!);
    }
    return new ModalBuilderClass({
      title: raw.title,
      customId: raw.custom_id,
      components: comps as ModalComponent[],
    });
  }

  /**
   * Gets the title of this modal.
   * @readonly
   */
  public get title(): string | undefined {
    return this.data.title;
  }

  /**
   * Gets the custom identifier of this modal.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Gets the components associated with this modal.
   * @readonly
   */
  public get components(): readonly ModalComponent[] {
    return this.data.components ?? [];
  }

      /**
   * Creates a new ModalBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: ModalOptions<string, string, ModalComponent[]>) {
    if (!opts.title) throw new Error('title is required');
    if (opts.title.length > 45) {
      throw new Error(`title is too long, max is 45 characters but got ${opts.title.length}`);
    }

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');
    if (cid.length > 100) {
      throw new Error(`customId is too long, max is 100 characters but got ${cid.length}`);
    }

    this.data.title = opts.title;
    this.data.custom_id = cid;
    this.data.components = [];

    if (opts.components !== undefined)
      this.setComponents(opts.components as ModalComponent[]);
  }

  /**
   * Sets the title displayed at the top of the modal (maximum of 45 characters).
   * @param title The title text to set
   * @returns This builder instance
   * @throws If title exceeds 45 characters
   */
  setTitle(title: string): this {
    if (title.length > 45) {
      throw new Error(`title is too long, max is 45 characters but got ${title.length}`);
    }
    this.data.title = title;
    return this;
  }

      /**
   * Sets the custom identifier for this component (maximum of 100 characters).
   * @param cid - The unique custom identifier.
   * @returns This builder instance for chaining.
   */
  setCustomId(cid: string): this {
    if (cid.length < 1) {
      throw new Error('customId needs to be at least 1 character');
    }
    if (cid.length > 100) {
      throw new Error(`customId is too long, max is 100 characters but got ${cid.length}`);
    }
    this.data.custom_id = cid;
    return this;
  }

  /**
   * Replaces all components inside this modal (must be between 1 and 5 entries).
   * @param components Array of components to set
   * @returns This builder instance
   * @throws If components count is not between 1 and 5
   */
  setComponents(components: ModalComponent[]): this {
    if (components.length < 1 || components.length > 5)
      throw new Error(
        `components must have between 1 and 5 entries, but got ${components.length}`,
      );
    this.data.components = [...components];
    return this;
  }

  /**
   * Appends components to this modal (maximum of 5 components total).
   * @param components Components to add
   * @returns This builder instance
   * @throws If adding components would exceed maximum of 5
   */
  addComponents(...components: ModalComponent[]): this {
    if (!this.data.components) this.data.components = [];
    if (this.data.components.length + components.length > 5)
      throw new Error("components size can't exceed 5");
    this.data.components.push(...components);
    return this;
  }

  /**
   * Appends label components to this modal.
   * @param components Label components to add
   * @returns This builder instance
   * @throws If adding components would exceed maximum of 5
   */
  addLabelComponents(...components: LabelBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends text display components to this modal.
   * @param components Text display components to add
   * @returns This builder instance
   * @throws If adding components would exceed maximum of 5
   */
  addTextDisplayComponents(...components: TextDisplayBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Replaces all label components in this modal.
   * @param components Array of label components to set
   * @returns This builder instance
   * @throws If components count is not between 1 and 5
   */
  setLabelComponents(components: LabelBuilder[]): this {
    if (components.length < 1 || components.length > 5)
      throw new Error(
        `components must have between 1 and 5 entries, but got ${components.length}`,
      );
    this.data.components = [...components];
    return this;
  }

  /**
   * Replaces all text display components in this modal.
   * @param components Array of text display components to set
   * @returns This builder instance
   * @throws If components count is not between 1 and 5
   */
  setTextDisplayComponents(components: TextDisplayBuilder[]): this {
    if (components.length < 1 || components.length > 5)
      throw new Error(
        `components must have between 1 and 5 entries, but got ${components.length}`,
      );
    this.data.components = [...components];
    return this;
  }

  /**
   * Splices text display components in-place.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param components Components to insert
   * @returns This builder instance
   * @throws If result would not be between 1 and 5 components
   */
  spliceTextDisplayComponents(
    index: number,
    deleteCount: number,
    ...components: TextDisplayBuilder[]
  ): this {
    if (!this.data.components) this.data.components = [];
    this.data.components.splice(
      index,
      deleteCount,
      ...components,
    );
    if (this.data.components.length < 1 || this.data.components.length > 5)
      throw new Error(
        `components must have between 1 and 5 entries, but got ${this.data.components.length}`,
      );
    return this;
  }

  /**
   * Splices label components in-place.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param components Components to insert
   * @returns This builder instance
   * @throws If result would not be between 1 and 5 components
   */
  spliceLabelComponents(
    index: number,
    deleteCount: number,
    ...components: LabelBuilder[]
  ): this {
    if (!this.data.components) this.data.components = [];
    this.data.components.splice(
      index,
      deleteCount,
      ...components,
    );
    if (this.data.components.length < 1 || this.data.components.length > 5)
      throw new Error(
        `components must have between 1 and 5 entries, but got ${this.data.components.length}`,
      );
    return this;
  }

  /**
   * Clones this modal builder.
   * @returns A deep copy of this builder
   */
  clone(): this {
    return ModalBuilderClass.from(this.toJSON()) as unknown as this;
  }

      /**
   * Serializes the ModalBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
toJSON(): APIModalStructure {
    const len = this.components.length;
    if (len < 1 || len > 5) {
      throw new Error(`components must have between 1 and 5 entries, but got ${len}`);
    }
    const comps = new Array(len);
    for (let i = 0; i < len; i++) {
      comps[i] = (this.components[i] as any).toJSON();
    }
    const payload: APIModalStructure = {
      title: this.data.title ?? '',
      custom_id: this.data.custom_id ?? '',
      components: comps,
    };
    BaseComponent.validateTreeLimits(payload);
    return payload;
  }
}

export const ModalBuilder = ModalBuilderClass as unknown as {
  new <
    Title extends string,
    CustomId extends string = string,
    ComponentType extends ModalComponent = ModalComponent,
    Components extends readonly ComponentType[] = readonly ComponentType[],
  >(
    opts: ModalOptions<Title, CustomId, Components>,
  ): ModalBuilderInstance<CustomId, Components>;
  from(data: APIModalStructure): ModalBuilder;
};

export type ModalBuilder = ModalBuilderClass;
