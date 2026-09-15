import { ComponentType } from '../enums.ts';
import type { APISectionComponent, APITextDisplayComponent, APIButtonComponent, APIThumbnailComponent } from '../types.ts';
import type { CheckArrayLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/** Bounds of a section's text display list. */
const MIN_COMPONENTS = 1;
const MAX_COMPONENTS = 3;

/**
 * Rejects children Discord does not allow inside a Section.
 *
 * @param components - The children to check.
 * @throws If any child is not a TextDisplay component.
 */
function assertSectionChildren(components: readonly { type?: number }[]): void {
  for (let i = 0; i < components.length; i++) {
    const type = components[i]?.type;
    if (type !== ComponentType.TextDisplay) {
      throw new Error(`Section can only contain TextDisplay components, but got type ${type}`);
    }
  }
}

function assertSectionAccessory(accessory: { type?: number } | undefined): void {
  const type = accessory?.type;
  if (type !== ComponentType.Button && type !== ComponentType.Thumbnail) {
    throw new Error(`Section accessory must be of type Button or Thumbnail, but got type ${type}`);
  }
}
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
  /** Accessory displayed on the right side; required before serialization. */
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
 * side-by-side with an accessory (Button or Thumbnail).
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
 * @see {@link https://docs.discord.com/developers/components/reference#section Discord Docs - Section}
 */
class SectionBuilderClass extends BaseComponent<Partial<APISectionComponent>> {
  public override readonly type = ComponentType.Section;

  /**
   * Loads a {@link SectionBuilder} from raw Discord data.
   *
   * @param data - Raw section payload from Discord.
   * @returns Populated `SectionBuilderClass` instance.
   *
   * @see {@link https://docs.discord.com/developers/components/reference#section Discord Docs}
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
   * The accessory component (Button or Thumbnail), if configured.
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
      if (len > MAX_COMPONENTS) throw new Error(`can't have more than ${MAX_COMPONENTS} components here`);
      assertSectionChildren(opts.components);
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
    let current = this.data.components;
    if (!current) {
      current = [];
      this.data.components = current;
    }
    if (current.length + components.length > MAX_COMPONENTS)
      throw new Error(`can't have more than ${MAX_COMPONENTS} components here`);
    assertSectionChildren(components);
    for (let i = 0; i < components.length; i++) {
      current.push(components[i] as unknown as APITextDisplayComponent);
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
    if (components.length > MAX_COMPONENTS) throw new Error(`can't have more than ${MAX_COMPONENTS} components here`);
    assertSectionChildren(components);
    const current = this.data.components ?? [];
    const next = current.slice();
    next.splice(index, deleteCount, ...components as unknown as APITextDisplayComponent[]);
    this.validateArrayLength(next, MIN_COMPONENTS, MAX_COMPONENTS, 'components');
    assertSectionChildren(next);
    current.splice(index, deleteCount, ...components as unknown as APITextDisplayComponent[]);
    this.data.components = current;
    return this;
  }

  /**
   * Sets the section accessory - either a {@link ButtonBuilder} or {@link ThumbnailBuilder}.
   *
   * @param accessory - The accessory component.
   * @returns This builder for chaining.
   * @throws If the accessory type is not Button or Thumbnail.
   *
   * @see {@link https://docs.discord.com/developers/components/reference#section Discord Docs}
   */
  setAccessory(accessory: SectionAccessory): this {
    assertSectionAccessory(accessory);
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
   * Clears the accessory while composing; set another before serialization.
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
   * @throws If children or accessory do not meet Section requirements.
   */
  override toJSON(): APISectionComponent {
    const comps = this.data.components;
    const len = comps ? comps.length : 0;
    if (len === 0)
      throw new Error('need at least one TextDisplay component to serialize');

    this.validateArrayLength(comps!, MIN_COMPONENTS, MAX_COMPONENTS, 'components');
    assertSectionChildren(comps!);
    const accessory = this.data.accessory;
    assertSectionAccessory(accessory);

    const serialized = new Array<APITextDisplayComponent>(len);
    for (let i = 0; i < len; i++) {
      serialized[i] = resolveRaw(comps![i]) as unknown as APITextDisplayComponent;
    }
    assertSectionChildren(serialized);
    const serializedAccessory = resolveRaw(accessory) as unknown as APIButtonComponent | APIThumbnailComponent;
    assertSectionAccessory(serializedAccessory);

    const res: APISectionComponent = {
      type: ComponentType.Section,
      components: serialized,
      accessory: serializedAccessory,
    };

    if (this.data.id !== undefined) res.id = this.data.id;

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
