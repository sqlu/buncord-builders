import { ComponentType, TextInputStyle } from '../enums.ts';
import type { APITextInputComponent } from '../types.ts';
import type { CheckMaxLength, WithId } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface BaseTextInputOptions<
  Label extends string = string,
  Placeholder extends string = string,
> {
  /**
   * Legacy inline label (max 45 characters). Prefer wrapping in a
   * {@link LabelBuilder} instead for new modal designs.
   */
  label?: Label & CheckMaxLength<Label, 45, 'Label'>;
  /** Input style: `Short` (single line) or `Paragraph` (multi-line). Defaults to `Short`. */
  style?: TextInputStyle;
  /** Minimum character length required for submission (0–4000). */
  minLength?: number;
  /** Alias for {@link minLength} using the raw API field name. */
  min_length?: number;
  /** Maximum character length allowed for submission (1–4000). */
  maxLength?: number;
  /** Alias for {@link maxLength} using the raw API field name. */
  max_length?: number;
  /** Placeholder text shown when the field is empty (max 100 characters). */
  placeholder?: Placeholder & CheckMaxLength<Placeholder, 100, 'Placeholder'>;
  /** Pre-filled default value (max 4000 characters). */
  value?: string;
  /** Whether the field must be filled before the modal can be submitted. */
  required?: boolean;
}

export type TextInputOptions<
  Label extends string = string,
  CustomId extends string = string,
  Placeholder extends string = string,
> = WithId<CustomId> & BaseTextInputOptions<Label, Placeholder>;

export interface TextInputBuilderInstance<CustomId extends string>
  extends TextInputBuilderClass {
  readonly customId: CustomId;
}

/**
 * Builds a Text Input component (type 4) for use inside modal forms.
 * Lets users enter freeform text - either a single line (`Short`) or a
 * multi-line block (`Paragraph`).
 *
 * **Modal-only** - text inputs cannot appear in regular message components.
 * Wrap the input in a {@link LabelBuilder} to show a descriptive label.
 *
 * @example
 * ```ts
 * const input = new TextInputBuilder({
 *   customId: 'feedback_',
 *   style: TextInputStyle.Paragraph,
 *   placeholder: 'Provide feedback for Snayz on discordts-builders',
 *   minLength: 10,
 *   maxLength: 1000,
 *   required: true,
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#text-input Discord Docs - Text Input}
 * @see {@link https://discord.com/developers/docs/components/reference#text-input-text-input-styles Text Input Styles}
 */
class TextInputBuilderClass extends BaseComponent<Partial<APITextInputComponent>> {
  public override readonly type = ComponentType.TextInput;

  /**
   * Recreates a {@link TextInputBuilder} from a raw Discord API payload.
   *
   * @param data - Raw text input payload from Discord.
   * @returns A fully hydrated `TextInputBuilderClass` instance.
   */
  public static from(data: APITextInputComponent): TextInputBuilderClass {
    const raw = resolveRaw(data) as unknown as APITextInputComponent;
    const builder = new TextInputBuilderClass({
      customId: raw.custom_id,
      style: raw.style,
    } as unknown as TextInputOptions<string, string, string>);
    if (raw.label !== undefined) builder.setLabel(raw.label);
    if (raw.min_length !== undefined) builder.setMinLength(raw.min_length);
    if (raw.max_length !== undefined) builder.setMaxLength(raw.max_length);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.value !== undefined) builder.setValue(raw.value);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The legacy inline label text.
   * @readonly
   * @deprecated Prefer wrapping in a {@link LabelBuilder} for new designs.
   */
  public get label(): string | undefined {
    return this.data.label;
  }

  /**
   * The custom identifier sent back on modal submit.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Get the input style (`Short` = 1 or `Paragraph` = 2).
   * @readonly
   */
  public get style(): TextInputStyle | undefined {
    return this.data.style;
  }

  /**
   * Get minimum character length.
   * @readonly
   */
  public get minLength(): number | undefined {
    return this.data.min_length;
  }

  /**
   * Get maximum character length.
   * @readonly
   */
  public get maxLength(): number | undefined {
    return this.data.max_length;
  }

  /**
   * Get placeholder text.
   * @readonly
   */
  public get placeholder(): string | undefined {
    return this.data.placeholder;
  }

  /**
   * Get value.
   * @readonly
   */
  public get value(): string | undefined {
    return this.data.value;
  }

  /**
   * Get if this field is required.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }

  private validateTextInputLengths(
    minLen: number | undefined,
    maxLen: number | undefined,
    val: string | undefined,
  ): void {
    if (minLen !== undefined) this.validateRange(minLen, 0, 4000, 'minLength');
    if (maxLen !== undefined) this.validateRange(maxLen, 1, 4000, 'maxLength');
    if (minLen !== undefined && maxLen !== undefined && minLen > maxLen)
      throw new Error(`min length can't be more than max length (you set min to ${minLen} and max to ${maxLen})`);
    if (val !== undefined) {
      if (val.length > 4000)
        throw new Error(`value is too long, max is 4000 characters but got ${val.length}`);
      if (minLen !== undefined && val.length < minLen)
        throw new Error(`value is too short, need at least ${minLen} characters but only got ${val.length}`);
      if (maxLen !== undefined && val.length > maxLen)
        throw new Error(`value is too long, max is ${maxLen} characters but got ${val.length}`);
    }
  }

      /**
   * Creates a new TextInputBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: TextInputOptions<string, string, string>) {
    super();
    this.data.type = ComponentType.TextInput;

    if (opts.label !== undefined) this.validateLength(opts.label, 45, 'label');

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');
    this.validateCustomId(cid);

    const minLen = opts.minLength ?? opts.min_length;
    const maxLen = opts.maxLength ?? opts.max_length;
    this.validateTextInputLengths(minLen, maxLen, opts.value);
    if (opts.placeholder !== undefined)
      this.validateLength(opts.placeholder, 100, 'placeholder');

    this.data.custom_id = cid;
    this.data.style = opts.style ?? TextInputStyle.Short;
    if (opts.label !== undefined) this.data.label = opts.label;
    if (opts.placeholder !== undefined) this.data.placeholder = opts.placeholder;
    if (opts.value !== undefined) this.data.value = opts.value;
    if (minLen !== undefined) this.data.min_length = minLen;
    if (maxLen !== undefined) this.data.max_length = maxLen;
    if (opts.required !== undefined) this.data.required = opts.required;
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
   * Sets the legacy inline label (max 45 characters).
   *
   * @param lbl - The label text.
   * @returns This builder for chaining.
   * @throws If label exceeds 45 characters.
   * @deprecated Wrap in a {@link LabelBuilder} for new designs.
   */
  setLabel(lbl: string): this {
    this.validateLength(lbl, 45, 'label');
    this.data.label = lbl;
    return this;
  }

  /**
   * Clears the legacy inline label.
   * @returns This builder for chaining.
   */
  clearLabel(): this {
    delete this.data.label;
    return this;
  }

  /**
   * Sets the text input style.
   *
   * @param style - `TextInputStyle.Short` for a single-line input, `TextInputStyle.Paragraph` for multi-line.
   * @returns This builder for chaining.
   *
   * @see {@link https://discord.com/developers/docs/components/reference#text-input-text-input-styles Discord Docs}
   */
  setStyle(style: TextInputStyle): this {
    this.data.style = style;
    return this;
  }

  /**
   * Sets the minimum character length required (0-4000).
   *
   * @param min - The minimum character count.
   * @returns This builder for chaining.
   * @throws If `min` is out of range or exceeds `maxLength`.
   */
  setMinLength(min: number): this {
    this.validateRange(min, 0, 4000, 'minLength');
    const max: number | undefined = this.data.max_length;
    if (max !== undefined && min > max)
      throw new Error(`min length can't be more than max length (you set min to ${min} and max to ${max})`);
    this.data.min_length = min;
    return this;
  }

  /**
   * Sets the maximum character length allowed (1-4000).
   *
   * @param max - The maximum character count.
   * @returns This builder for chaining.
   * @throws If `max` is out of range or less than `minLength`.
   */
  setMaxLength(max: number): this {
    this.validateRange(max, 1, 4000, 'maxLength');
    const min: number | undefined = this.data.min_length;
    if (min !== undefined && min > max)
      throw new Error(`min length can't be more than max length (you set min to ${min} and max to ${max})`);
    this.data.max_length = max;
    return this;
  }

  /**
   * Sets the placeholder text displayed when the field is empty (max 100 characters).
   *
   * @param placeholder - The placeholder string.
   * @returns This builder for chaining.
   */
  setPlaceholder(placeholder: string): this {
    this.validateLength(placeholder, 100, 'placeholder');
    this.data.placeholder = placeholder;
    return this;
  }

  /**
   * Sets the pre-filled default value shown in the input (max 4000 characters).
   *
   * @param value - The pre-filled string.
   * @returns This builder for chaining.
   */
  setValue(value: string): this {
    this.validateLength(value, 4000, 'value');
    this.data.value = value;
    return this;
  }

  /**
   * Sets whether this field is required to submit the modal.
   *
   * @param required - `true` to make the field mandatory.
   * @returns This builder for chaining.
   */
  setRequired(required: boolean): this {
    this.data.required = required;
    return this;
  }

  /**
   * Serializes this text input to the raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APITextInputComponent {
    const data = this.data;
    const res: APITextInputComponent = {
      type: ComponentType.TextInput,
      custom_id: data.custom_id ?? '',
      style: data.style ?? TextInputStyle.Short,
    };
    const id = this.id;
    if (id !== undefined) res.id = id;
    const label = data.label;
    if (label !== undefined) res.label = label;
    const placeholder = data.placeholder;
    if (placeholder !== undefined) res.placeholder = placeholder;
    const min_length = data.min_length;
    if (min_length !== undefined) res.min_length = min_length;
    const max_length = data.max_length;
    if (max_length !== undefined) res.max_length = max_length;
    const value = data.value;
    if (value !== undefined) res.value = value;
    const required = data.required;
    if (required !== undefined) res.required = required;
    return res;
  }
}

export const TextInputBuilder = TextInputBuilderClass as unknown as {
  new <
    Label extends string,
    CustomId extends string = string,
    Placeholder extends string = string,
  >(
    opts: TextInputOptions<Label, CustomId, Placeholder>,
  ): TextInputBuilderInstance<CustomId>;
  from(data: APITextInputComponent): TextInputBuilder;
};

export type TextInputBuilder = TextInputBuilderClass;
