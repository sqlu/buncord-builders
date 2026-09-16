import { componentValidationError } from '../utils/ComponentError.ts';
import { ButtonStyle, ComponentType } from '../enums.ts';
import type { APIMessageComponentEmoji, APIButtonComponent } from '../types.ts';
import type {
  ExtractCustomId,
  CheckMaxLength,
  CheckMinLength,
  CheckUrl,

  GetLabel,
  GetUrl,
  GetCustomIdField,
  CheckStringConstraints,
  CheckUrlConstraints,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/** Maximum length of a button label. */
const MAX_LABEL_LENGTH = 80;

/** Maximum length of a link button URL. */
const MAX_URL_LENGTH = 512;

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
      super({ type: ComponentType.Button, style: ButtonStyle.Primary } as Partial<APIButtonComponent>);
      return;
    }

    const style = opts.style ?? ButtonStyle.Primary;
    if (!Number.isInteger(style) || style < ButtonStyle.Primary || style > ButtonStyle.Premium)
      throw componentValidationError('BUTTON_VALIDATION_FAILED', 'style must be a button style between 1 and 6');
    const label = opts.label;
    if (label !== undefined && label.length > MAX_LABEL_LENGTH) {
      throw componentValidationError('BUTTON_VALIDATION_FAILED', `label is too long, max is ${MAX_LABEL_LENGTH} characters but got ${label.length}`);
    }

    const payload: Partial<APIButtonComponent> = { type: ComponentType.Button, style };

    if (style === ButtonStyle.Link) {
      const url = opts.url;
      if (url !== undefined) {
        if (url.length > MAX_URL_LENGTH) {
          throw componentValidationError('BUTTON_VALIDATION_FAILED', `url is too long, max is ${MAX_URL_LENGTH} characters but got ${url.length}`);
        }
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('discord://')) {
          throw componentValidationError('BUTTON_VALIDATION_FAILED', `url must be a valid http, https, or discord URL, got "${url}"`);
        }
        payload.url = url;
      }
    } else if (style === ButtonStyle.Premium) {
      const skuId = opts.skuId ?? opts.sku_id;
      if (skuId !== undefined) payload.sku_id = skuId;
    } else {
      const customId = opts.customId ?? opts.custom_id;
      if (customId !== undefined) {
        if (customId.length < 1 || customId.length > 100) {
          throw componentValidationError('BUTTON_VALIDATION_FAILED', `customId is invalid, must be between 1 and 100 characters`);
        }
        payload.custom_id = customId;
      }
    }

    // Premium buttons must not carry a label or an emoji.
    if (style !== ButtonStyle.Premium) {
      if (label !== undefined) payload.label = label;
      if (opts.emoji !== undefined) payload.emoji = opts.emoji;
    }
    if (opts.disabled !== undefined) payload.disabled = opts.disabled;

    super(payload);
  }

  /**
   * Sets the button style.
   * @param style The style to apply to the button.
   * @returns The builder instance for chaining.
   */
  setStyle(style: ButtonStyle): this {
    this.validateRange(style, ButtonStyle.Primary, ButtonStyle.Premium, 'style');
    const data = this.data;
    data.style = style;

    if (style === ButtonStyle.Link) {
      delete data.custom_id;
      delete data.sku_id;
    } else if (style === ButtonStyle.Premium) {
      delete data.custom_id;
      delete data.url;
      delete data.label;
      delete data.emoji;
    } else {
      delete data.url;
      delete data.sku_id;
    }
    return this;
  }

  /**
   * Sets the label text (limit 80 characters).
   * @param lbl Label text.
   * @returns The builder instance for chaining.
   */
  setLabel(lbl: CheckMaxLength<string, 80, 'label'>): this {
    this.validateLength(lbl, MAX_LABEL_LENGTH, 'label');
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
    this.validateMinLength(skuId, 1, 'skuId');
    this.data.sku_id = skuId;
    return this;
  }

  /**
   * Sets the link URL (limit 512 characters, `http://`, `https://` or `discord://`).
   *
   * @param url - The link URL.
   * @returns The builder instance for chaining.
   * @throws If the URL is too long or uses an unsupported scheme.
   */
  setURL(url: CheckUrl<string> & CheckMaxLength<string, 512, 'url'>): this {
    this.validateLength(url, MAX_URL_LENGTH, 'url');
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
   * @see {@link https://docs.discord.com/developers/components/reference#button}
   */
  override toJSON(): APIButtonComponent {
    const data = this.data;
    this.validateRange(data.style as number, ButtonStyle.Primary, ButtonStyle.Premium, 'style');
    if (data.style === ButtonStyle.Link) {
      this.validateHttpUrl(data.url ?? '', 'url');
      this.validateLength(data.url, MAX_URL_LENGTH, 'url');
      if (data.custom_id !== undefined || data.sku_id !== undefined)
        throw componentValidationError('BUTTON_VALIDATION_FAILED', 'Link buttons cannot have customId or skuId');
    } else if (data.style === ButtonStyle.Premium) {
      if (typeof data.sku_id !== 'string' || !data.sku_id) throw componentValidationError('BUTTON_VALIDATION_FAILED', 'skuId is required');
      if (data.custom_id !== undefined || data.url !== undefined || data.label !== undefined || data.emoji !== undefined)
        throw componentValidationError('BUTTON_VALIDATION_FAILED', 'Premium buttons cannot have customId, url, label or emoji');
    } else {
      this.validateCustomId(data.custom_id ?? '');
      if (data.url !== undefined || data.sku_id !== undefined)
        throw componentValidationError('BUTTON_VALIDATION_FAILED', 'Interactive buttons cannot have url or skuId');
    }
    this.validateLength(data.label, MAX_LABEL_LENGTH, 'label');
    return data as APIButtonComponent;
  }
}


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
