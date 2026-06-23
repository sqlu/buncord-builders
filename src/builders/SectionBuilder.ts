import { ComponentType } from '../enums.ts';
import type { APISectionComponent, APITextDisplayComponent, APIButtonComponent, APIThumbnailComponent } from '../types.ts';
import type { CheckArrayLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';
import type { TextDisplayBuilder } from './TextDisplayBuilder.ts';
import type { ButtonBuilder } from './ButtonBuilder.ts';
import type { ThumbnailBuilder } from './ThumbnailBuilder.ts';

/**
 * Valid components that can be used as a Section accessory.
 */
export type SectionAccessory = ButtonBuilder | ThumbnailBuilder;

/**
 * Config options for a new SectionBuilder.
 * @template Components The array of TextDisplayBuilder components.
 */
export interface SectionOptions<
  Components extends readonly TextDisplayBuilder[] = TextDisplayBuilder[],
> {
  /** The child text displays grouped inside the section. */
  components?: Components & CheckArrayLength<Components, 1, 3, 'components'>;
  /** An optional accessory displayed on the right side of the section. */
  accessory?: SectionAccessory;
}

/**
 * Interface for a fully configured SectionBuilder.
 * @template Components The components contained in the section.
 */
export interface SectionBuilderInstance<
  Components extends readonly TextDisplayBuilder[] = readonly TextDisplayBuilder[],
> extends SectionBuilderClass {
  /** The child text displays configured in the section. */
  readonly components: Components;
}

/**
 * Builds a Section component that groups up to 3 {@link TextDisplayBuilder}
 * side-by-side with an optional accessory (Button or Thumbnail).
 *
 * Sections are V2 message-only components (`IS_COMPONENTS_V2` flag required).
 *
 * @example
 * ```ts
 * const section = new SectionBuilder({
 *   components: [
 *     new TextDisplayBuilder({ content: '# Hello, Snayz.' }),
 *   ],
 *   accessory: new ThumbnailBuilder({ url: 'https://cdn.example.com/avatar.png' }),
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#section Discord Docs - Section}
 */
class SectionBuilderClass extends BaseComponent<Partial<APISectionComponent>> {
  public override readonly type = ComponentType.Section;

  /**
   * Loads a {@link SectionBuilder} from raw Discord data.
   *
   * @param data - Raw section payload from Discord.
   * @returns Populated `SectionBuilderClass` instance.
   *
   * @see {@link https://discord.com/developers/docs/components/reference#section-section-structure Discord Docs}
   */
  public static from(data: APISectionComponent): SectionBuilderClass {
    const raw = resolveRaw(data) as unknown as APISectionComponent;
    const comps = (raw.components ?? []).map((c) => BaseComponent.resolve!(c) as TextDisplayBuilder);
    const builder = new SectionBuilderClass({ components: comps });
    if (raw.accessory !== undefined) builder.setAccessory(BaseComponent.resolve!(raw.accessory) as SectionAccessory);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The text display sub-components inside this section (1 to 3 entries).
   * @readonly
   */
  public get components(): readonly TextDisplayBuilder[] {
    return (this.data.components ?? []) as unknown as readonly TextDisplayBuilder[];
  }

  /**
   * The optional accessory component (Button or Thumbnail) on the right side.
   * @readonly
   */
  public get accessory(): SectionAccessory | undefined {
    return this.data.accessory as unknown as SectionAccessory | undefined;
  }

  /**
   * Creates a new SectionBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: SectionOptions<TextDisplayBuilder[]>) {
    const payload: Partial<APISectionComponent> = {
      type: ComponentType.Section,
      components: [],
    };
    super(payload as Partial<APISectionComponent>);

    if (!opts) return;
    if (opts.components !== undefined) {
      const len = opts.components.length;
      if (len > 3) throw new Error("can't have more than 3 components here");
      this.data.components = opts.components as unknown as APITextDisplayComponent[];
    }
    if (opts.accessory !== undefined) this.setAccessory(opts.accessory);
  }

  /**
   * Appends {@link TextDisplayBuilder} components to this section (max 3 total).
   *
   * @param components - Text display components to add.
   * @returns This builder for chaining.
   * @throws If adding would exceed the 3-component limit.
   */
  addTextDisplayComponents(...components: TextDisplayBuilder[]): this {
    if (!this.data.components) this.data.components = [];
    const cur = this.data.components.length;
    const add = components.length;
    if (cur + add > 3)
      throw new Error("can't have more than 3 components here");
    for (let i = 0; i < add; i++) {
      this.data.components.push(components[i] as unknown as APITextDisplayComponent);
    }
    return this;
  }

  /**
   * Splices text display components in-place (result must keep 1-3 entries).
   *
   * @param index - Start index.
   * @param deleteCount - How many to remove.
   * @param components - Replacements to insert.
   * @returns This builder for chaining.
   */
  spliceTextDisplayComponents(index: number, deleteCount: number, ...components: TextDisplayBuilder[]): this {
    if (!this.data.components) this.data.components = [];
    (this.data.components as unknown as TextDisplayBuilder[]).splice(index, deleteCount, ...components);
    this.validateArrayLength(this.data.components, 1, 3, 'components');
    return this;
  }

  /**
   * Sets the section accessory - either a {@link ButtonBuilder} or {@link ThumbnailBuilder}.
   *
   * @param accessory - The accessory component.
   * @returns This builder for chaining.
   * @throws If the accessory type is not Button or Thumbnail.
   *
   * @see {@link https://discord.com/developers/docs/components/reference#section-section-structure Discord Docs}
   */
  setAccessory(accessory: SectionAccessory): this {
    const t = accessory.type;
    if (t !== ComponentType.Button && t !== ComponentType.Thumbnail)
      throw new Error(`Section accessory must be of type Button or Thumbnail, but got type ${t}`);
    this.data.accessory = accessory as unknown as APIButtonComponent | APIThumbnailComponent;
    return this;
  }

  /**
   * Sets the section accessory as a button component.
   * @param button - The ButtonBuilder instance.
   * @returns This builder for chaining.
   */
  setButtonAccessory(button: ButtonBuilder): this { return this.setAccessory(button); }

  /**
   * Sets the section accessory as a thumbnail image.
   * @param thumbnail - The ThumbnailBuilder instance.
   * @returns This builder for chaining.
   */
  setThumbnailAccessory(thumbnail: ThumbnailBuilder): this { return this.setAccessory(thumbnail); }

  /**
   * Clears the optional accessory from this section.
   * @returns This builder for chaining.
   */
  clearAccessory(): this {
    delete this.data.accessory;
    return this;
  }

  /**
   * Convert to raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If there are no text display components.
   */
  override toJSON(): Record<string, unknown> {
    const comps = this.data.components;
    const len = comps ? comps.length : 0;
    if (len === 0)
      throw new Error('need at least one TextDisplay component to serialize');
    const serialized = new Array(len);
    for (let i = 0; i < len; i++) {
      serialized[i] = (comps![i] as TextDisplayBuilder).toJSON();
    }
    const res: Record<string, unknown> = {
      type: ComponentType.Section,
      components: serialized,
    };
    const acc = this.data.accessory as SectionAccessory | undefined;
    if (acc) {
      res.accessory = acc.toJSON();
    }
    const idVal = this.id !== undefined ? this.id : this.data.id;
    if (idVal !== undefined) {
      res.id = idVal;
    }
    return res;
  }
}

export const SectionBuilder = SectionBuilderClass as unknown as {
  new <ComponentType extends TextDisplayBuilder = TextDisplayBuilder, Components extends readonly ComponentType[] = readonly ComponentType[]>(opts?: SectionOptions<Components>): SectionBuilderInstance<Components>;
  from(data: APISectionComponent): SectionBuilder;
};

/**
 * Alias for SectionBuilderClass.
 */
export type SectionBuilder = SectionBuilderClass;