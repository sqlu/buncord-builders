import { ComponentType, SeparatorSpacingSize } from '../enums.ts';
import type { APISeparatorComponent } from '../types.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new SeparatorBuilder.
 */
export interface SeparatorOptions {
  /** Whether to render a visible horizontal line. Defaults to true if unset. */
  divider?: boolean;
  /** Vertical spacing around the separator (`Small` = 1, `Large` = 2). */
  spacing?: SeparatorSpacingSize;
}

/**
 * Interface for a fully configured SeparatorBuilder.
 */
export interface SeparatorBuilderInstance extends SeparatorBuilderClass {}

/**
 * Builds a Separator component: a visual or spacing divider between
 * other V2 message components inside a {@link ContainerBuilder}.
 *
 * Separators are purely visual; they carry no interactive state.
 *
 * @example
 * ```ts
 * const sep = new SeparatorBuilder({ divider: true, spacing: SeparatorSpacingSize.Large });
 * ```
 *
 * @see {@link https://docs.discord.com/developers/components/reference#separator Discord Docs - Separator}
 */
class SeparatorBuilderClass extends BaseComponent<Partial<APISeparatorComponent>> {
  public override readonly type = ComponentType.Separator;

  /**
   * Loads a {@link SeparatorBuilder} from raw Discord data.
   *
   * @param data - Raw separator payload from Discord.
   * @returns Populated `SeparatorBuilderClass` instance.
   */
  public static from(data: APISeparatorComponent): SeparatorBuilderClass {
    const raw = resolveRaw(data) as unknown as APISeparatorComponent;
    const builder = new SeparatorBuilderClass();
    if (raw.divider !== undefined) builder.setDivider(raw.divider);
    if (raw.spacing !== undefined) builder.setSpacing(raw.spacing);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Whether a visible horizontal divider line is rendered.
   * @readonly
   */
  public get divider(): boolean | undefined {
    return this.data.divider;
  }

  /**
   * The vertical spacing size.
   * @readonly
   */
  public get spacing(): SeparatorSpacingSize | undefined {
    return this.data.spacing;
  }

  /**
   * Creates a new SeparatorBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: SeparatorOptions) {
    super();
    this.data.type = ComponentType.Separator;
    if (!opts) return;
    if (opts.divider !== undefined) this.data.divider = opts.divider;
    if (opts.spacing !== undefined) this.setSpacing(opts.spacing);
  }

  /**
   * Sets whether a visible horizontal line is rendered across the separator.
   *
   * @param divider - `true` to show the line, `false` to hide it (spacing only).
   * @returns This builder for chaining.
   */
  setDivider(divider: boolean): this {
    this.data.divider = divider;
    return this;
  }

  /**
   * Sets the vertical spacing size around the separator.
   *
   * @param spacing - `SeparatorSpacingSize.Small` (1) or `SeparatorSpacingSize.Large` (2).
   * @returns This builder for chaining.
   *
   * @see {@link https://docs.discord.com/developers/components/reference#separator-spacing-type Discord Docs}
   */
  setSpacing(spacing: SeparatorSpacingSize): this {
    this.validateRange(spacing, SeparatorSpacingSize.Small, SeparatorSpacingSize.Large, 'spacing');
    this.data.spacing = spacing;
    return this;
  }

  /**
   * Clears the spacing size, letting Discord fall back to its default.
   * @returns This builder for chaining.
   */
  clearSpacing(): this {
    delete this.data.spacing;
    return this;
  }

  /**
   * Convert to raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APISeparatorComponent {
    if (this.data.spacing !== undefined)
      this.validateRange(this.data.spacing, SeparatorSpacingSize.Small, SeparatorSpacingSize.Large, 'spacing');
    return this.data as APISeparatorComponent;
  }
}

export const SeparatorBuilder = SeparatorBuilderClass as unknown as {
  new (opts?: SeparatorOptions): SeparatorBuilderInstance;
  from(data: APISeparatorComponent): SeparatorBuilder;
};

/**
 * Alias for SeparatorBuilderClass.
 */
export type SeparatorBuilder = SeparatorBuilderClass;
