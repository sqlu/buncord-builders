import { ButtonStyle, ComponentType } from '../enums.ts';
import type { APIMessageComponentEmoji, APIButtonComponent } from '../types.ts';
import type {
  CheckMaxLength,
  CheckMinLength,
  CheckUrl,
  WithId,
  GetLabel,
  GetUrl,
  GetCustomIdField,
  CheckStringConstraints,
  CheckUrlConstraints,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new ButtonBuilder.
 * @template CustomId The custom ID string literal.
 * @template Label The label text string literal.
 * @template Url The URL string literal.
 */
export interface ButtonOptions<
  CustomId extends string = string,
  Label extends string = string,
  Url extends string = string,
> {
  /** Button visual style. */
  style?: ButtonStyle;
  /** Button text label (up to 80 chars). */
  label?: Label;
  /** Emoji next to the button text. */
  emoji?: APIMessageComponentEmoji;
  /** Disable the button? */
  disabled?: boolean;
  /** Link URL (up to 512 chars, Link buttons only). */
  url?: Url;
  /** SKU ID for monetization (Premium buttons only). */
  skuId?: string;
  /** Alias for skuId. */
  sku_id?: string;
  /** Custom ID sent on click (up to 100 chars, ignore on Link/Premium). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

/**
 * Type-level validation for ButtonOptions.
 * @template Opts The user configuration options object.
 */
export type ValidateButtonOptions<Opts> =
  CheckStringConstraints<GetLabel<Opts>, 1, 80, 'Label'> extends { readonly error: string }
  ? CheckStringConstraints<GetLabel<Opts>, 1, 80, 'Label'>
  : CheckUrlConstraints<GetUrl<Opts>, 512, 'url'> extends { readonly error: string }
  ? CheckUrlConstraints<GetUrl<Opts>, 512, 'url'>
  : CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { style: ButtonStyle.Link }
  ? (Opts extends { customId: unknown } | { custom_id: unknown }
      ? { readonly error: 'Link button must not have a customId or custom_id property' }
      : Opts extends { skuId: unknown } | { sku_id: unknown }
      ? { readonly error: 'Link button must not have a skuId or sku_id property' }
      : unknown)
  : Opts extends { style: ButtonStyle.Premium }
  ? (Opts extends { customId: unknown } | { custom_id: unknown }
      ? { readonly error: 'Premium button must not have a customId or custom_id property' }
      : Opts extends { url: unknown }
      ? { readonly error: 'Premium button must not have a url property' }
      : Opts extends { label: unknown }
      ? { readonly error: 'Premium button must not have a label property' }
      : Opts extends { emoji: unknown }
      ? { readonly error: 'Premium button must not have an emoji property' }
      : unknown)
  : (Opts extends { url: unknown }
      ? { readonly error: 'Regular button must not have a url property' }
      : Opts extends { skuId: unknown } | { sku_id: unknown }
      ? { readonly error: 'Regular button must not have a skuId or sku_id property' }
      : Opts extends { customId: string; custom_id: string }
      ? { readonly error: 'Cannot specify both customId and custom_id' }
      : unknown);

/**
 * Interface for a fully configured ButtonBuilder.
 * @template CustomId The custom ID of the button.
 */
export interface ButtonBuilderInstance<CustomId extends string>
  extends ButtonBuilderClass {
  /** Custom ID of this button. */
  readonly customId: CustomId;
}

/**
 * Represents a clickable Button component.
 * Supports regular buttons (requires customId), link buttons (requires url), and premium buttons (requires skuId).
 * 
 * @example
 * ```ts
 * const button = new ButtonBuilder({
 *   customId: 'repo',
 *   label: 'Star buncord-builders',
 *   style: ButtonStyle.Primary,
 * });
 * ```
 */
class ButtonBuilderClass extends BaseComponent<Partial<APIButtonComponent>> {
  public override readonly type = ComponentType.Button;

  /**
   * Recreates a ButtonBuilder from a raw API payload.
   * @param data Raw API button data.
   * @returns A new ButtonBuilder instance.
   */
  public static from(data: APIButtonComponent): ButtonBuilderClass {
    const raw = resolveRaw(data) as unknown as APIButtonComponent;
    // Workaround for exactOptionalPropertyTypes and constructor checks.
    // Branch based on the style of the button.
    if (raw.style === ButtonStyle.Link) {
      const opts: Record<string, unknown> = { style: ButtonStyle.Link, url: raw.url };
      if (raw.label !== undefined) opts.label = raw.label;
      if (raw.emoji !== undefined) opts.emoji = raw.emoji;
      const builder = new ButtonBuilderClass(opts as unknown as ButtonOptions);
      if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
      if (raw.id !== undefined) builder.setId(raw.id);
      return builder;
    }

    if (raw.style === ButtonStyle.Premium) {
      const builder = new ButtonBuilderClass({
        style: ButtonStyle.Premium,
        skuId: raw.sku_id,
      } as unknown as ButtonOptions);
      if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
      if (raw.id !== undefined) builder.setId(raw.id);
      return builder;
    }

    const opts: Record<string, unknown> = {
      style: raw.style ?? ButtonStyle.Primary,
      customId: raw.custom_id,
    };
    if (raw.label !== undefined) opts.label = raw.label;
    if (raw.emoji !== undefined) opts.emoji = raw.emoji;
    const builder = new ButtonBuilderClass(opts as unknown as ButtonOptions);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the style of the button.
   * @readonly
   * @returns The button style.
   */
  public get style(): ButtonStyle | undefined {
    return this.data.style;
  }

  /**
   * Gets the label text of the button.
   * @readonly
   * @returns Label text.
   */
  public get label(): string | undefined {
    return this.data.label;
  }

  /**
   * Gets the emoji of the button.
   * @readonly
   * @returns The emoji associated with the button.
   */
  public get emoji(): APIMessageComponentEmoji | undefined {
    return this.data.emoji;
  }

  /**
   * Gets the custom identifier of the button.
   * @readonly
   * @returns Custom ID.
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Gets the SKU identifier for premium buttons.
   * @readonly
   * @returns The SKU identifier.
   */
  public get skuId(): string | undefined {
    return this.data.sku_id;
  }

  /**
   * Gets the link URL of the button.
   * @readonly
   * @returns The link URL.
   */
  public get url(): string | undefined {
    return this.data.url;
  }

  /**
   * Gets whether the button is disabled.
   * @readonly
   * @returns True if disabled, false otherwise.
   */
  public get disabled(): boolean | undefined {
    return this.data.disabled;
  }

  /**
   * Creates a new ButtonBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: ButtonOptions<string, string, string>) {
    if (!opts) {
      super({ type: ComponentType.Button } as Partial<APIButtonComponent>);
      return;
    }
    const s = opts.style;
    const label = opts.label;
    const emoji = opts.emoji;
    const disabled = opts.disabled;
    let custom_id: string | undefined;
    let url: string | undefined;
    let sku_id: string | undefined;

    if (label !== undefined) {
      if (label.length > 80) throw new Error(`label is too long, max is 80 characters but got ${label.length}`);
    }

    if (s === ButtonStyle.Link) {
      url = opts.url;
      if (url !== undefined) {
        if (url.length > 512) throw new Error(`url is too long, max is 512 characters but got ${url.length}`);
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('discord://')) {
          throw new Error(`url must be a valid http, https, or discord URL, got "${url}"`);
        }
      }
    } else if (s === ButtonStyle.Premium) {
      sku_id = opts.skuId ?? opts.sku_id;
    } else {
      custom_id = opts.customId ?? opts.custom_id;
      if (custom_id !== undefined) {
        if (custom_id.length < 1 || custom_id.length > 100) throw new Error(`customId is invalid, must be between 1 and 100 characters`);
      }
    }

    const payload = {
      type: ComponentType.Button,
      style: s,
      label,
      emoji,
      disabled,
      custom_id,
      url,
      sku_id,
    } as unknown as Partial<APIButtonComponent>;

    super(payload);
  }

  /**
   * Sets the button style.
   * @param style The style to apply to the button.
   * @returns The builder instance for chaining.
   */
  setStyle(style: ButtonStyle): this {
    this.data.style = style;
    
    if (style === ButtonStyle.Link) {
      if (this.data.custom_id !== undefined) (this.data as Record<string, unknown>).custom_id = undefined;
      if (this.data.sku_id !== undefined) (this.data as Record<string, unknown>).sku_id = undefined;
    } else if (style === ButtonStyle.Premium) {
      if (this.data.custom_id !== undefined) (this.data as Record<string, unknown>).custom_id = undefined;
      if (this.data.url !== undefined) (this.data as Record<string, unknown>).url = undefined;
      if (this.data.label !== undefined) (this.data as Record<string, unknown>).label = undefined;
      if (this.data.emoji !== undefined) (this.data as Record<string, unknown>).emoji = undefined;
    } else {
      if (this.data.url !== undefined) (this.data as Record<string, unknown>).url = undefined;
      if (this.data.sku_id !== undefined) (this.data as Record<string, unknown>).sku_id = undefined;
    }
    return this;
  }

  /**
   * Sets the label text (limit 80 characters).
   * @param lbl Label text.
   * @returns The builder instance for chaining.
   */
  setLabel(lbl: CheckMaxLength<string, 80, 'label'>): this {
    this.validateLength(lbl, 80, 'label');
    this.data.label = lbl;
    return this;
  }

  /**
   * Sets the button emoji.
   * @param emoji The emoji to display on the button.
   * @returns The builder instance for chaining.
   */
  setEmoji(emoji: APIMessageComponentEmoji): this {
    this.data.emoji = emoji;
    return this;
  }

      /**
   * Sets the custom ID (up to 100 chars).
   * @param cid - Unique custom ID.
   * @returns This builder for chaining.
   */
  setCustomId(cid: CheckMinLength<string, 1, 'customId'> & CheckMaxLength<string, 100, 'customId'>): this {
    this.validateCustomId(cid);
    this.data.custom_id = cid;
    return this;
  }

  /**
   * Sets the SKU identifier for premium buttons.
   * @param skuId The SKU identifier.
   * @returns The builder instance for chaining.
   */
  setSKUId(skuId: CheckMinLength<string, 1, 'skuId'> & CheckMaxLength<string, 100, 'skuId'>): this {
    this.data.sku_id = skuId;
    return this;
  }

  /**
   * Sets the link URL (limit 512 characters, http/https only).
   * @param url The link URL.
   * @returns The builder instance for chaining.
   */
  setURL(url: CheckUrl<string> & CheckMaxLength<string, 512, 'url'>): this {
    this.validateLength(url, 512, 'url');
    this.validateHttpUrl(url, 'url');
    this.data.url = url;
    return this;
  }

  /**
   * Sets whether the button is disabled.
   * @param disabled Disabled state.
   * @returns The builder instance for chaining.
   */
  setDisabled(disabled: boolean): this {
    this.data.disabled = disabled;
    return this;
  }

  /**
   * Converts this Button builder into a raw API payload structure.
   * 
   * @returns The serialized Button component payload.
   * 
   * @see {@link https://discord.com/developers/docs/interactions/message-components#button-object}
   */
  override toJSON(): APIButtonComponent {
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    if (this.data.style === undefined) {
      this.data.style = ButtonStyle.Primary;
    }
    return this.data as APIButtonComponent;
  }
}

import type { ExtractCustomId } from '../utils/guards.ts';

export const ButtonBuilder = ButtonBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Label extends string = string,
    Url extends string = string,
    Opts extends ButtonOptions<CustomId, Label, Url> = ButtonOptions<CustomId, Label, Url>,
  >(
    opts?: Opts & ValidateButtonOptions<Opts>,
  ): ButtonBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APIButtonComponent): ButtonBuilder;
};

/**
 * Alias for ButtonBuilderClass.
 */
export type ButtonBuilder = ButtonBuilderClass;
