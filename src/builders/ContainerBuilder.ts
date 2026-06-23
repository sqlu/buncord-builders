import { ComponentType } from '../enums.ts';
import type { RGBTuple, APIContainerComponent, APIContainerComponentChild } from '../types.ts';
import type { CheckArrayLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';
import type { ActionRowBuilder } from './ActionRowBuilder.ts';
import type { FileBuilder } from './FileBuilder.ts';
import type { MediaGalleryBuilder } from './MediaGalleryBuilder.ts';
import type { SectionBuilder } from './SectionBuilder.ts';
import type { SeparatorBuilder } from './SeparatorBuilder.ts';
import type { TextDisplayBuilder } from './TextDisplayBuilder.ts';

/**
 * Valid layout components that can be placed inside a V2 Container.
 */
export type ContainerComponent =
  | ActionRowBuilder
  | FileBuilder
  | MediaGalleryBuilder
  | SectionBuilder
  | SeparatorBuilder
  | TextDisplayBuilder;

/**
 * Config options for a new ContainerBuilder.
 * @template Components The array of child components.
 */
export interface ContainerOptions<
  Components extends readonly ContainerComponent[] = ContainerComponent[],
> {
  /** The accent color of the left container border as RGB tuple [r, g, b] or integer. */
  accentColor?: RGBTuple | number;
  /** The accent color of the left container border (alias of accentColor). */
  accent_color?: RGBTuple | number;
  /** Whether the container's contents are blurred behind a spoiler filter. */
  spoiler?: boolean;
  /** The child components in the container (1-10 components allowed). */
  components?: Components & CheckArrayLength<Components, 1, 10, 'components'>;
}

/**
 * Interface for a fully configured ContainerBuilder.
 * @template Components The components contained in the container.
 */
export interface ContainerBuilderInstance<
  Components extends readonly ContainerComponent[] = readonly ContainerComponent[],
> extends ContainerBuilderClass {
  /** The child components configured in the container. */
  readonly components: Components;
}

/**
 * Builds a Container component: a V2 embed layout wrapper that groups
 * up to 10 sub-components with an optional accent color border and spoiler overlay.
 *
 * Only usable in messages with the `IS_COMPONENTS_V2` flag set.
 * Valid children: {@link ActionRowBuilder}, {@link FileBuilder}, {@link MediaGalleryBuilder},
 * {@link SectionBuilder}, {@link SeparatorBuilder}, {@link TextDisplayBuilder}.
 *
 * @example
 * ```ts
 * const container = new ContainerBuilder({
 *   components: [
 *     new SeparatorBuilder({ divider: true }),
 *     new TextDisplayBuilder({ content: '# Hello, Snayz!' }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#container Discord Docs - Container}
 */
class ContainerBuilderClass extends BaseComponent<Partial<APIContainerComponent>> {
  public override readonly type = ComponentType.Container;

  /**
   * Recreates a ContainerBuilder from a raw API payload.
   * @param data Raw container data payload
   * @returns A new ContainerBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIContainerComponent): ContainerBuilderClass {
    const raw = resolveRaw(data) as unknown as APIContainerComponent;
    const comps = (raw.components ?? []).map((c) => BaseComponent.resolve!(c) as ContainerComponent);
    const builder = new ContainerBuilderClass({
      components: comps,
    });
    if (raw.accent_color !== undefined) builder.setAccentColor(raw.accent_color);
    if (raw.spoiler !== undefined) builder.setSpoiler(raw.spoiler);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the sub-components inside the container.
   * @readonly
   */
  public get components(): readonly ContainerComponent[] {
    return (this.data.components ?? []) as unknown as readonly ContainerComponent[];
  }

  /**
   * Gets the accent border color of the container.
   * @readonly
   */
  public get accentColor(): number | undefined {
    return this.data.accent_color;
  }

  /**
   * Gets whether the container has a spoiler blur applied.
   * @readonly
   */
  public get spoiler(): boolean | undefined {
    return this.data.spoiler;
  }

  /**
* Creates a new ContainerBuilder.
* @param opts - Config options.
*/
  constructor(opts?: ContainerOptions<ContainerComponent[]>) {
    const payload: Partial<APIContainerComponent> = {
      type: ComponentType.Container,
      components: [],
    };
    super(payload as Partial<APIContainerComponent>);

    if (!opts) return;

    const col = opts.accentColor ?? opts.accent_color;
    if (col !== undefined) this.setAccentColor(col);
    if (opts.spoiler !== undefined) this.setSpoiler(opts.spoiler);
    if (opts.components !== undefined) {
      const len = opts.components.length;
      if (len > 10) throw new Error("components size can't exceed 10");
      this.data.components = opts.components as unknown as APIContainerComponentChild[];
    }
  }

  /**
   * Sets the accent color of the left border (format RGB tuple or integer).
   * @param color Color as RGB tuple [r, g, b] or integer 0x000000-0xFFFFFF
   * @returns This builder instance
   * @throws If color values are outside valid ranges
   */
  setAccentColor(color: RGBTuple | number): this {
    if (Array.isArray(color)) {
      const [r, g, b] = color as RGBTuple;
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error(`RGB values must be between 0 and 255, but got [${r}, ${g}, ${b}]`);
      }
      this.data.accent_color = (r << 16) + (g << 8) + b;
    } else {
      if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
        throw new Error(`accent color must be between 0x000000 and 0xFFFFFF, but got ${color}`);
      }
      this.data.accent_color = color;
    }
    return this;
  }

  /**
   * Clears the accent border color.
   * @returns This builder instance
   */
  clearAccentColor(): this {
    delete this.data.accent_color;
    return this;
  }

  /**
   * Blurs the container behind a spoiler filter.
   * @param spoiler Whether to apply spoiler blur
   * @returns This builder instance
   */
  setSpoiler(spoiler: boolean): this {
    this.data.spoiler = spoiler;
    return this;
  }

  /**
   * Adds components to the container (maximum of 10 in total).
   * @param components Components to add
   * @returns This builder instance
   * @throws If total components would exceed 10
   */
  addComponents(...components: ContainerComponent[]): this {
    if (!this.data.components) this.data.components = [];
    const cur = this.data.components.length;
    const add = components.length;
    if (cur + add > 10)
      throw new Error("components size can't exceed 10");
    for (let i = 0; i < add; i++) {
      this.data.components.push(components[i] as unknown as APIContainerComponentChild);
    }
    return this;
  }

  /**
   * Appends action row components to the container.
   * @param components Action row components to add
   * @returns This builder instance
   */
  addActionRowComponents(...components: ActionRowBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends file components to the container.
   * @param components File components to add
   * @returns This builder instance
   */
  addFileComponents(...components: FileBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends media gallery components to the container.
   * @param components Media gallery components to add
   * @returns This builder instance
   */
  addMediaGalleryComponents(...components: MediaGalleryBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends section components to the container.
   * @param components Section components to add
   * @returns This builder instance
   */
  addSectionComponents(...components: SectionBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends separator components to the container.
   * @param components Separator components to add
   * @returns This builder instance
   */
  addSeparatorComponents(...components: SeparatorBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Appends text display components to the container.
   * @param components Text display components to add
   * @returns This builder instance
   */
  addTextDisplayComponents(...components: TextDisplayBuilder[]): this {
    return this.addComponents(...components);
  }

  /**
   * Splices components in the container.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param components Components to insert
   * @returns This builder instance
   * @throws If result would not have between 1 and 10 components
   */
  spliceComponents(
    index: number,
    deleteCount: number,
    ...components: ContainerComponent[]
  ): this {
    if (!this.data.components) this.data.components = [];
    (this.data.components as unknown as ContainerComponent[]).splice(
      index,
      deleteCount,
      ...components,
    );
    this.validateArrayLength(this.data.components, 1, 10, 'components');
    return this;
  }

  /**
   * Converts this builder to a JSON payload.
   * @returns The JSON representation
   * @throws If there are no components or tree limits are exceeded
   */
  override toJSON(): APIContainerComponent {
    const comps = this.data.components;
    const len = comps ? comps.length : 0;
    if (len === 0) {
      throw new Error('need at least one component to serialize');
    }
    const serialized = new Array(len);
    for (let i = 0; i < len; i++) {
      const c = comps![i] as ContainerComponent;
      serialized[i] = c.toJSON();
    }
    const res: APIContainerComponent = {
      type: ComponentType.Container,
      components: serialized,
    };
    if (this.data.accent_color !== undefined) {
      res.accent_color = this.data.accent_color;
    }
    if (this.data.spoiler !== undefined) {
      res.spoiler = this.data.spoiler;
    }
    const idVal = this.id !== undefined ? this.id : this.data.id;
    if (idVal !== undefined) {
      res.id = idVal;
    }
    BaseComponent.validateTreeLimits(res);
    return res;
  }
}

export const ContainerBuilder = ContainerBuilderClass as unknown as {
  new <
    ComponentType extends ContainerComponent = ContainerComponent,
    Components extends readonly ComponentType[] = readonly ComponentType[],
  >(
    opts?: ContainerOptions<Components>,
  ): ContainerBuilderInstance<Components>;
  from(data: APIContainerComponent): ContainerBuilder;
};

/**
 * Alias for ContainerBuilderClass.
 */
export type ContainerBuilder = ContainerBuilderClass;
