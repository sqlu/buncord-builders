import { ComponentType, TextInputStyle } from '../enums.ts';
import type { APITextInputComponent } from '../types.ts';
import type {
  CheckMaxLength,
  CheckMinLength,
  IsLessThanOrEqual,
  ExtractCustomId,
  GetLabel,
  GetCustomIdField,
  CheckStringConstraints,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new TextInputBuilder.
 * @template Label The label string literal.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template Value The pre-filled value string literal.
 * @template MinLength The minimum character length.
 * @template MaxLength The maximum character length.
 */
export interface TextInputOptions<
  Label extends string = string,
  CustomId extends string = string,
  Placeholder extends string = string,
  Value extends string = string,
  MinLength extends number = number,
  MaxLength extends number = number,
> {
  /** Legacy inline label text (up to 45 chars). */
  label?: Label;
  /** Input style (Short or Paragraph). */
  style?: TextInputStyle;
  /** Min character count (0 to 4000). */
  minLength?: MinLength;
  /** Alias for minLength. */
  min_length?: MinLength;
  /** Max character count (1 to 4000). */
  maxLength?: MaxLength;
  /** Alias for maxLength. */
  max_length?: MaxLength;
  /** Ghost text when empty (up to 100 chars). */
  placeholder?: Placeholder;
  /** Pre-filled default value (up to 4000 chars). */
  value?: Value;
  /** Is this field required? Defaults to true. */
  required?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

type GetPlaceholder<Opts> = Opts extends { placeholder: infer P } ? (P extends string ? P : never) : never;
type GetValue<Opts> = Opts extends { value: infer V } ? (V extends string ? V : never) : never;
type GetMinLength<Opts> =
  Opts extends { minLength: infer M }
  ? M
  : Opts extends { min_length: infer M }
  ? M
  : never;
type GetMaxLength<Opts> =
  Opts extends { maxLength: infer M }
  ? M
  : Opts extends { max_length: infer M }
  ? M
  : never;

/**
 * Type-level validation for TextInputOptions.
 * @template Opts The user configuration options.
 */
export type ValidateTextInputOptions<Opts> =
  CheckStringConstraints<GetLabel<Opts>, 1, 45, 'Label'> extends { readonly error: string }
  ? CheckStringConstraints<GetLabel<Opts>, 1, 45, 'Label'>
  : CheckStringConstraints<GetPlaceholder<Opts>, 1, 100, 'Placeholder'> extends { readonly error: string }
  ? CheckStringConstraints<GetPlaceholder<Opts>, 1, 100, 'Placeholder'>
  : CheckStringConstraints<GetValue<Opts>, 1, 4000, 'Value'> extends { readonly error: string }
  ? CheckStringConstraints<GetValue<Opts>, 1, 4000, 'Value'>
  : CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : ([GetMinLength<Opts>] extends [never]
      ? unknown
      : [GetMaxLength<Opts>] extends [never]
      ? unknown
      : IsLessThanOrEqual<GetMinLength<Opts> & number, GetMaxLength<Opts> & number> extends true
      ? unknown
      : { readonly error: 'minLength cannot be greater than maxLength' });

/**
 * Interface for a fully configured TextInputBuilder.
 * @template CustomId The custom ID of the text input.
 */
export interface TextInputBuilderInstance<CustomId extends string>
  extends TextInputBuilderClass {
  /** Custom ID of this input. */
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
 *   customId: 'feedback',
 *   style: TextInputStyle.Paragraph,
 *   placeholder: 'Provide feedback for Snayz on buncord-builders',
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
   * Loads a {@link TextInputBuilder} from raw Discord data.
   *
   * @param data - Raw text input payload from Discord.
   * @returns Populated `TextInputBuilderClass` instance.
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
   * @deprecated Wrap in {@link LabelBuilder} instead.
   */
  public get label(): string | undefined {
    return this.data.label;
  }

  /**
   * Custom ID sent back on submit.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Get input style (Short/Paragraph).
   * @readonly
   */
  public get style(): TextInputStyle | undefined {
    return this.data.style;
  }

  /**
   * Get min length.
   * @readonly
   */
  public get minLength(): number | undefined {
    return this.data.min_length;
  }

  /**
   * Get max length.
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
   * Check if field is required.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }


  /**
   * Creates a new TextInputBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: TextInputOptions<string, string, string, string>) {
    if (!opts) {
      super({
        type: ComponentType.TextInput,
        style: TextInputStyle.Short,
      } as Partial<APITextInputComponent>);
      return;
    }

    const cid = opts.customId ?? opts.custom_id;
    const minLen = opts.minLength ?? opts.min_length;
    const maxLen = opts.maxLength ?? opts.max_length;

    if (opts.label !== undefined && opts.label.length > 45) {
      throw new Error(`label is too long, max is 45 characters but got ${opts.label.length}`);
    }
    if (cid !== undefined) {
      const len = cid.length;
      if (len < 1) {
        throw new Error(`customId is too short, need at least 1 character(s) but got 0`);
      }
      if (len > 100) {
        throw new Error(`customId is too long, max is 100 characters but got ${len}`);
      }
    }
    if (minLen !== undefined && (minLen < 0 || minLen > 4000)) {
      throw new Error(`minLength must be between 0 and 4000, but you set it to ${minLen}`);
    }
    if (maxLen !== undefined && (maxLen < 1 || maxLen > 4000)) {
      throw new Error(`maxLength must be between 1 and 4000, but you set it to ${maxLen}`);
    }
    if (minLen !== undefined && maxLen !== undefined && minLen > maxLen) {
      throw new Error(`min length can't be more than max length (you set min to ${minLen} and max to ${maxLen})`);
    }
    const value = opts.value;
    if (value !== undefined) {
      if (value.length > 4000) {
        throw new Error(`value is too long, max is 4000 characters but got ${value.length}`);
      }
      if (minLen !== undefined && value.length < minLen) {
        throw new Error(`value is too short, need at least ${minLen} characters but only got ${value.length}`);
      }
      if (maxLen !== undefined && value.length > maxLen) {
        throw new Error(`value is too long, max is ${maxLen} characters but got ${value.length}`);
      }
    }
    if (opts.placeholder !== undefined && opts.placeholder.length > 100) {
      throw new Error(`placeholder is too long, max is 100 characters but got ${opts.placeholder.length}`);
    }

    const payload: Partial<APITextInputComponent> = {
      type: ComponentType.TextInput,
      style: opts.style ?? TextInputStyle.Short,
    };
    if (opts.label !== undefined) payload.label = opts.label;
    if (cid !== undefined) payload.custom_id = cid;
    if (opts.placeholder !== undefined) payload.placeholder = opts.placeholder;
    if (opts.value !== undefined) payload.value = opts.value;
    if (minLen !== undefined) payload.min_length = minLen;
    if (maxLen !== undefined) payload.max_length = maxLen;
    if (opts.required !== undefined) payload.required = opts.required;

    super(payload);
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
   * Sets legacy inline label (up to 45 chars).
   *
   * @param lbl - Label text.
   * @returns This builder for chaining.
   * @throws If label exceeds 45 characters.
   * @deprecated Wrap in {@link LabelBuilder} instead.
   */
  setLabel(lbl: CheckMaxLength<string, 45, 'label'>): this {
    this.validateLength(lbl, 45, 'label');
    this.data.label = lbl;
    return this;
  }

  /**
   * Clears legacy inline label.
   * @returns This builder for chaining.
   */
  clearLabel(): this {
    delete this.data.label;
    return this;
  }

  /**
   * Sets input style.
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
   * Sets min character length (0-4000).
   *
   * @param min - Min characters.
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
   * Sets max character length (1-4000).
   *
   * @param max - Max characters.
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
   * Sets placeholder (up to 100 chars).
   *
   * @param placeholder - Placeholder text.
   * @returns This builder for chaining.
   */
  setPlaceholder(placeholder: CheckMaxLength<string, 100, 'placeholder'>): this {
    this.validateLength(placeholder, 100, 'placeholder');
    this.data.placeholder = placeholder;
    return this;
  }

  /**
   * Sets default value (up to 4000 chars).
   *
   * @param value - Default value string.
   * @returns This builder for chaining.
   */
  setValue(value: CheckMaxLength<string, 4000, 'value'>): this {
    this.validateLength(value, 4000, 'value');
    this.data.value = value;
    return this;
  }

  /**
   * Sets if field is required.
   *
   * @param required - True to make it required.
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
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    if (this.data.style === undefined) {
      this.data.style = TextInputStyle.Short;
    }
    return this.data as APITextInputComponent;
  }
}

export const TextInputBuilder = TextInputBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Label extends string = string,
    Placeholder extends string = string,
    Value extends string = string,
    MinLength extends number = number,
    MaxLength extends number = number,
    Opts extends TextInputOptions<Label, CustomId, Placeholder, Value, MinLength, MaxLength> = TextInputOptions<Label, CustomId, Placeholder, Value, MinLength, MaxLength>,
  >(
    opts?: Opts & ValidateTextInputOptions<Opts>,
  ): TextInputBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APITextInputComponent): TextInputBuilder;
};

/**
 * Alias for TextInputBuilderClass.
 */
export type TextInputBuilder = TextInputBuilderClass;
