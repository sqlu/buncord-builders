import { ButtonStyle, ComponentType } from '../enums.ts';
import type { APIMessageComponentEmoji, APIButtonComponent } from '../types.ts';
import type { CheckMaxLength, WithId } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

type RegularButtonOptions<
  CustomId extends string,
  Label extends string,
> = WithId<CustomId> & {
  style: Exclude<ButtonStyle, ButtonStyle.Link | ButtonStyle.Premium>;
  label?: Label & CheckMaxLength<Label, 80, 'Label'>;
  emoji?: APIMessageComponentEmoji;
  disabled?: boolean;
  url?: never;
  skuId?: never;
  sku_id?: never;
};

type LinkButtonOptions<Label extends string> = {
  style: ButtonStyle.Link;
  url: string;
  label?: Label & CheckMaxLength<Label, 80, 'Label'>;
  emoji?: APIMessageComponentEmoji;
  disabled?: boolean;
  customId?: never;
  custom_id?: never;
  skuId?: never;
  sku_id?: never;
};

type PremiumButtonOptions = {
  style: ButtonStyle.Premium;
  skuId?: string;
  sku_id?: string;
  disabled?: boolean;
  label?: never;
  emoji?: never;
  customId?: never;
  custom_id?: never;
  url?: never;
};

export type AllButtonOptions<
  CustomId extends string = string,
  Label extends string = string,
> =
  | RegularButtonOptions<CustomId, Label>
  | LinkButtonOptions<Label>
  | PremiumButtonOptions;

export interface ButtonBuilderInstance<CustomId extends string>
  extends ButtonBuilderClass {
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
 *   label: 'Star discordts-builders',
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
      const builder = new ButtonBuilderClass(opts as unknown as AllButtonOptions);
      if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
      if (raw.id !== undefined) builder.setId(raw.id);
      return builder;
    }

    if (raw.style === ButtonStyle.Premium) {
      const builder = new ButtonBuilderClass({
        style: ButtonStyle.Premium,
        skuId: raw.sku_id,
      } as unknown as AllButtonOptions);
      if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
      if (raw.id !== undefined) builder.setId(raw.id);
      return builder;
    }

    const builder = new ButtonBuilderClass({
      style: raw.style ?? ButtonStyle.Primary,
      customId: raw.custom_id,
    } as unknown as AllButtonOptions);
    if (raw.label !== undefined) builder.setLabel(raw.label);
    if (raw.emoji !== undefined) builder.setEmoji(raw.emoji);
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
   * @returns The label text.
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
   * @returns The custom identifier.
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
   * Creates a new ButtonBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: AllButtonOptions<string, string>) {
    super();
    this.data.type = ComponentType.Button;

    const s = opts.style;
    if (s !== undefined) {
      this.data.style = s;
    }
    if (opts.label !== undefined) {
      const lbl = opts.label as string;
      if (lbl.length > 80) throw new Error(`label is too long, max is 80 characters but got ${lbl.length}`);
      this.data.label = lbl;
    }
    if (opts.emoji !== undefined) this.data.emoji = opts.emoji;
    if (opts.disabled !== undefined) this.data.disabled = opts.disabled;

    if (s === ButtonStyle.Link) {
      const url = (opts as LinkButtonOptions<string>).url;
      if (!url) throw new Error('Link button requires a url');
      if (url.length > 512) throw new Error(`url is too long, max is 512 characters but got ${url.length}`);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(`url must be a valid http or https URL, got "${url}"`);
      }
      this.data.url = url;
      if (!opts.label && !opts.emoji)
        throw new Error('Link button must have a label or emoji');
    } else if (s === ButtonStyle.Premium) {
      const sku = (opts as PremiumButtonOptions).skuId ?? (opts as PremiumButtonOptions).sku_id;
      if (!sku) throw new Error('Premium button requires a skuId');
      this.data.sku_id = sku;
    } else {
      const cid = (opts as RegularButtonOptions<string, string>).customId ?? (opts as RegularButtonOptions<string, string>).custom_id;
      if (!cid) throw new Error('Regular button requires a customId');
      if (cid.length < 1 || cid.length > 100) throw new Error(`customId is invalid, must be between 1 and 100 characters`);
      this.data.custom_id = cid as string;
    }
  }

  /**
   * Sets the button style.
   * @param style The style to apply to the button.
   * @returns The builder instance for chaining.
   */
  setStyle(style: ButtonStyle): this {
    this.data.style = style;
    
    if (style === ButtonStyle.Link) {
      if (this.data.custom_id !== undefined) delete this.data.custom_id;
      if (this.data.sku_id !== undefined) delete this.data.sku_id;
    } else if (style === ButtonStyle.Premium) {
      if (this.data.custom_id !== undefined) delete this.data.custom_id;
      if (this.data.url !== undefined) delete this.data.url;
      if (this.data.label !== undefined) delete this.data.label;
      if (this.data.emoji !== undefined) delete this.data.emoji;
    } else {
      if (this.data.url !== undefined) delete this.data.url;
      if (this.data.sku_id !== undefined) delete this.data.sku_id;
    }
    return this;
  }

  /**
   * Sets the label text (limit 80 characters).
   * @param lbl The label text.
   * @returns The builder instance for chaining.
   */
  setLabel(lbl: string): this {
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
   * Sets the custom identifier for this component (maximum of 100 characters).
   * @param cid - The unique custom identifier.
   * @returns This builder instance for chaining.
   */
  setCustomId(cid: string): this {
    this.validateCustomId(cid);
    this.data.custom_id = cid;
    return this;
  }

  /**
   * Sets the SKU identifier for premium buttons.
   * @param skuId The SKU identifier.
   * @returns The builder instance for chaining.
   */
  setSKUId(skuId: string): this {
    this.data.sku_id = skuId;
    return this;
  }

  /**
   * Sets the link URL (limit 512 characters, http/https only).
   * @param url The link URL.
   * @returns The builder instance for chaining.
   */
  setURL(url: string): this {
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
    const data = this.data;
    const style = data.style ?? ButtonStyle.Primary;
    const res: APIButtonComponent = {
      type: ComponentType.Button,
      style,
    };
    const id = this.id;
    if (id !== undefined) res.id = id;
    const label = data.label;
    if (label !== undefined) res.label = label;
    const emoji = data.emoji;
    if (emoji !== undefined) res.emoji = emoji;
    const disabled = data.disabled;
    if (disabled !== undefined) res.disabled = disabled;

    if (style === ButtonStyle.Link) {
      const url = data.url;
      if (url !== undefined) res.url = url;
    } else if (style === ButtonStyle.Premium) {
      const sku_id = data.sku_id;
      if (sku_id !== undefined) res.sku_id = sku_id;
    } else {
      const custom_id = data.custom_id;
      if (custom_id !== undefined) res.custom_id = custom_id;
    }
    return res;
  }
}

/**
 * Re-exports ButtonBuilder with its static .from() method and fluent interface.
 * 
 * @see {@link https://discord.com/developers/docs/interactions/message-components#buttons}
 */
export const ButtonBuilder = ButtonBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Label extends string = string,
  >(
    opts: AllButtonOptions<CustomId, Label>,
  ): ButtonBuilderInstance<CustomId>;
  from(data: APIButtonComponent): ButtonBuilder;
};

export type ButtonBuilder = ButtonBuilderClass;
