import { ComponentType, type ChannelType, SelectMenuDefaultValueType } from '../enums.ts';
import type {
  APIMessageComponentEmoji,
  APISelectMenuOption,
  APISelectMenuDefaultValue,
  APIStringSelectComponent,
  APIUserSelectComponent,
  APIRoleSelectComponent,
  APIMentionableSelectComponent,
  APIChannelSelectComponent,
} from '../types.ts';
import type {
  CheckArrayLength,
  CheckMaxLength,
  CheckMinLength,
  AllowedSelectMenuRange,
  IsLessThanOrEqual,
  GetCustomIdField,
  CheckStringConstraints,
  ExtractCustomId,
  ValidateSelectMenuRequired,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw, serializeEntries } from './base.ts';
import { componentError, componentValidationError } from '../utils/ComponentError.ts';
import { validateOptionFields } from '../utils/OptionValidation.ts';

/** Maximum length of a select menu placeholder. */
const MAX_PLACEHOLDER_LENGTH = 150;

/** Bounds shared by every select menu's `min_values` and `max_values`. */
const MAX_SELECTED_VALUES = 25;

/** Bounds of a string select menu's option list. */
const MIN_OPTIONS = 1;
const MAX_OPTIONS = 25;

/**
 * Allowed `default_values` types per select menu, frozen at module scope so the
 * hot validation path never allocates.
 */
const USER_DEFAULT_TYPES: readonly string[] = Object.freeze([SelectMenuDefaultValueType.User]);
const ROLE_DEFAULT_TYPES: readonly string[] = Object.freeze([SelectMenuDefaultValueType.Role]);
const CHANNEL_DEFAULT_TYPES: readonly string[] = Object.freeze([SelectMenuDefaultValueType.Channel]);
const MENTIONABLE_DEFAULT_TYPES: readonly string[] = Object.freeze([
  SelectMenuDefaultValueType.User,
  SelectMenuDefaultValueType.Role,
]);

/** A select menu default value accepted either as a bare snowflake or a full object. */
type DefaultValueInput = string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) };

/** The subset of constructor options every select menu shares. */
interface CommonSelectMenuOptions {
  customId?: string;
  custom_id?: string;
  placeholder?: string;
  minValues?: number;
  min_values?: number;
  maxValues?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Validates the options every select menu shares and writes them onto the
 * payload, skipping unset fields so the serialized payload never carries
 * `undefined` holes.
 *
 * This runs before `super()`, so it lives at module scope rather than on the
 * class, and it writes straight into the payload to avoid an intermediate
 * object on the construction hot path.
 *
 * @param payload - The payload under construction.
 * @param opts - The raw constructor options.
 * @throws If any shared constraint is violated.
 */
function initSelectMenuPayload(payload: Record<string, unknown>, opts: CommonSelectMenuOptions): void {
  const customId = opts.customId ?? opts.custom_id;
  if (customId !== undefined) {
    if (customId.length < 1 || customId.length > 100) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'customId is invalid, must be between 1 and 100 characters');
    }
    payload.custom_id = customId;
  }

  const minValues = opts.minValues ?? opts.min_values;
  const maxValues = opts.maxValues ?? opts.max_values;
  const required = opts.required;

  if (minValues !== undefined) {
    if (!Number.isInteger(minValues) || minValues < 0 || minValues > MAX_SELECTED_VALUES) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `minValues must be between 0 and ${MAX_SELECTED_VALUES}, but you set it to ${minValues}`);
    }
    // Discord defaults `required` to true on select menus, so min_values of 0
    // only makes sense once the menu is explicitly marked optional.
    if (minValues === 0 && required !== false) {
      throw componentError('minValues can only be 0 if required is false', {
        code: 'SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL',
        fix: 'Omit minValues, set it to at least 1, or set required to false',
      });
    }
    payload.min_values = minValues;
  }

  if (maxValues !== undefined) {
    if (!Number.isInteger(maxValues) || maxValues < 1 || maxValues > MAX_SELECTED_VALUES) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `maxValues must be between 1 and ${MAX_SELECTED_VALUES}, but you set it to ${maxValues}`);
    }
    if (minValues !== undefined && minValues > maxValues) {
      throw componentError(`minValues can't be more than maxValues (you set minValues to ${minValues} and maxValues to ${maxValues})`, {
        code: 'SELECT_MENU_MIN_EXCEEDS_MAX',
        fix: 'Ensure minValues is less than or equal to maxValues',
      });
    }
    payload.max_values = maxValues;
  }

  const placeholder = opts.placeholder;
  if (placeholder !== undefined) {
    if (placeholder.length > MAX_PLACEHOLDER_LENGTH) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `placeholder is too long, max is ${MAX_PLACEHOLDER_LENGTH} characters but got ${placeholder.length}`);
    }
    payload.placeholder = placeholder;
  }

  if (required !== undefined) payload.required = required;
  if (opts.disabled !== undefined) payload.disabled = opts.disabled;
}

/**
 * Maps snowflakes or partial default value objects to full API default values.
 *
 * @param entries - Snowflakes or `{ id, type }` objects.
 * @param fallbackType - The type applied to entries that do not carry one.
 * @returns The normalized default values.
 */
function toDefaultValues(
  entries: readonly DefaultValueInput[],
  fallbackType: SelectMenuDefaultValueType,
): APISelectMenuDefaultValue[] {
  const len = entries.length;
  const values = new Array<APISelectMenuDefaultValue>(len);
  for (let i = 0; i < len; i++) {
    const entry = entries[i]!;
    values[i] = typeof entry === 'string'
      ? { id: entry, type: fallbackType }
      : { id: entry.id, type: entry.type ?? fallbackType };
  }
  return values;
}

interface APIBaseSelectMenuComponent {
  type: ComponentType;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  id?: number;
}

/**
 * Common base class for all Discord Select Menu builders.
 */
abstract class BaseSelectMenuBuilderClass<
  TData extends Partial<APIBaseSelectMenuComponent> = Partial<APIBaseSelectMenuComponent>,
> extends BaseComponent<TData> {
  constructor(data?: TData) {
    super(data);
  }
  
  /**
   * Gets the custom identifier of this select menu.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Gets the custom placeholder text of this select menu.
   * @readonly
   */
  public get placeholder(): string | undefined {
    return this.data.placeholder;
  }

  /**
   * Gets the minimum number of items required to select.
   * @readonly
   */
  public get minValues(): number | undefined {
    return this.data.min_values;
  }

  /**
   * Gets the maximum number of items allowed to select.
   * @readonly
   */
  public get maxValues(): number | undefined {
    return this.data.max_values;
  }

  /**
   * Gets whether this select menu is disabled.
   * @readonly
   */
  public get disabled(): boolean | undefined {
    return this.data.disabled;
  }

  /**
   * Gets whether this select menu is required in a modal.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }

  protected validateSelectMenuValues(
    min: number | undefined,
    max: number | undefined,
    required: boolean | undefined = this.data.required,
  ): void {
    if (min !== undefined) this.validateRange(min, 0, MAX_SELECTED_VALUES, 'minValues');
    if (max !== undefined) this.validateRange(max, 1, MAX_SELECTED_VALUES, 'maxValues');
    if (min !== undefined && max !== undefined && min > max) {
      throw componentError(`minValues can't be more than maxValues (you set minValues to ${min} and maxValues to ${max})`, {
        code: 'SELECT_MENU_MIN_EXCEEDS_MAX',
        fix: 'Ensure minValues is less than or equal to maxValues',
      });
    }
    if (min === 0 && required !== false) {
      throw componentError('minValues can only be 0 if required is false', {
        code: 'SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL',
        fix: 'Omit minValues, set it to at least 1, or set required to false',
      });
    }
  }

  /** Rechecks required fields and mutable bounds before handing out a payload. */
  protected validateSerialization(): void {
    this.validateCustomId(this.data.custom_id ?? '');
    this.validateSelectMenuValues(this.data.min_values, this.data.max_values);
    this.validateLength(this.data.placeholder, MAX_PLACEHOLDER_LENGTH, 'placeholder');
  }

  /**
   * Validates a `default_values` list against this menu's constraints.
   *
   * @param vals - The default values to check.
   * @param allowed - The value types this menu accepts.
   * @param min - The configured `minValues`, if any.
   * @param max - The configured `maxValues`, if any.
   * @throws If the count is out of bounds or a value type is not allowed.
   */
  protected validateDefaultValues(
    vals: readonly { id: string; type: string }[] | undefined,
    allowed: readonly string[],
    min: number | undefined,
    max: number | undefined,
  ): void {
    if (!vals || vals.length === 0) return;
    const count = vals.length;
    if (count > MAX_SELECTED_VALUES) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `can't have more than ${MAX_SELECTED_VALUES} default values`);
    if (min !== undefined && count < min) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `default_values count (${count}) is less than minValues (${min})`);
    }
    if (max !== undefined && count > max) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `default_values count (${count}) exceeds maxValues (${max})`);
    }
    for (let i = 0; i < count; i++) {
      const type = vals[i]!.type;
      if (!allowed.includes(type))
        throw componentError(`default type "${type}" is invalid, must be one of: ${allowed.join(', ')}`, {
          code: 'SELECT_DEFAULT_VALUE_TYPE_INVALID',
          fix: `Change type to one of the allowed types: ${allowed.join(', ')}`,
        });
    }
  }

  protected initCommon(
    cid: string,
    placeholder: string | undefined,
    min: number | undefined,
    max: number | undefined,
    disabled: boolean | undefined,
    required: boolean | undefined,
  ): void {
    this.validateCustomId(cid);
    this.validateSelectMenuValues(min, max, required);
    if (placeholder !== undefined) this.validateLength(placeholder, MAX_PLACEHOLDER_LENGTH, 'placeholder');

    const d = this.data as Record<string, unknown>;
    d.custom_id = cid;
    if (placeholder !== undefined) d.placeholder = placeholder;
    if (min !== undefined) d.min_values = min;
    if (max !== undefined) d.max_values = max;
    if (required !== undefined) d.required = required;
    if (disabled !== undefined) d.disabled = disabled;
  }

      /**
   * Sets the custom ID (up to 100 chars).
   * @param cid - Unique custom ID.
   * @returns This builder for chaining.
   */
  setCustomId(cid: CheckMinLength<string, 1, 'customId'> & CheckMaxLength<string, 100, 'customId'>): this {
    this.validateCustomId(cid);
    (this.data as Record<string, unknown>).custom_id = cid;
    return this;
  }

  /**
   * Sets the custom placeholder text displayed when no option is chosen (maximum of 150 characters).
   * @param placeholder The placeholder text to set
   * @returns This builder instance
   * @throws If placeholder exceeds 150 characters
   */
  setPlaceholder(placeholder: CheckMaxLength<string, 150, 'placeholder'>): this {
    this.validateLength(placeholder, MAX_PLACEHOLDER_LENGTH, 'placeholder');
    (this.data as Record<string, unknown>).placeholder = placeholder;
    return this;
  }

  /**
   * Sets the minimum number of selected choices required (between 0 and 25).
   * @param min The minimum value to set
   * @returns This builder instance
   * @throws If minValues is invalid or exceeds maxValues
   */
  setMinValues(min: number): this {
    this.validateSelectMenuValues(min, this.data.max_values);
    (this.data as Record<string, unknown>).min_values = min;
    return this;
  }

  /**
   * Sets the maximum number of selected choices allowed (between 1 and 25).
   * @param max The maximum value to set
   * @returns This builder instance
   * @throws If maxValues is invalid or less than minValues
   */
  setMaxValues(max: number): this {
    this.validateSelectMenuValues(this.data.min_values, max);
    (this.data as Record<string, unknown>).max_values = max;
    return this;
  }

  /**
   * Sets whether this select menu is disabled.
   * @param disabled Whether to disable the menu
   * @returns This builder instance
   */
  setDisabled(disabled: boolean): this {
    (this.data as Record<string, unknown>).disabled = disabled;
    return this;
  }

  /**
   * Sets whether this select menu is required in a modal.
   * @param required Whether selection is required
   * @returns This builder instance
   * @throws If required conflicts with minValues
   */
  setRequired(required: boolean): this {
    this.validateSelectMenuValues(this.data.min_values, this.data.max_values, required);
    (this.data as Record<string, unknown>).required = required;
    return this;
  }
}

/**
 * Compile-time validated select menu option interface.
 * @template Label The option label text string literal.
 * @template Value The option value string literal.
 * @template Description The optional option description string literal.
 */
export interface TypeSafeSelectMenuOption<
  Label extends string = string,
  Value extends string = string,
  Description extends string = string,
> {
  /** The option label text (1-100 characters). */
  label?: Label & CheckMinLength<Label, 1, 'label'> & CheckMaxLength<Label, 100, 'label'>;
  /** The value returned when this option is selected (1-100 characters). */
  value?: Value & CheckMinLength<Value, 1, 'value'> & CheckMaxLength<Value, 100, 'value'>;
  /** Optional description text displayed under the label (max 100 characters). */
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  /** Optional emoji displayed next to the option text. */
  emoji?: APIMessageComponentEmoji;
  /** Whether this option starts pre-selected by default. */
  default?: boolean;
}

/**
 * Represents an option within a String Select Menu dropdown.
 */
class StringSelectMenuOptionBuilderClass {
  public data: Partial<APISelectMenuOption> = {};

  /**
   * Recreates a StringSelectMenuOptionBuilder from a raw API payload.
   * @param data Raw select menu option data payload
   * @returns A new StringSelectMenuOptionBuilderClass instance
   */
  public static from(data: APISelectMenuOption): StringSelectMenuOptionBuilderClass {
    const raw = resolveRaw(data) as unknown as APISelectMenuOption;
    const builder = new StringSelectMenuOptionBuilderClass({
      value: raw.value,
      label: raw.label,
    } as unknown as TypeSafeSelectMenuOption<string, string, string>);
    if (raw.description !== undefined) builder.setDescription(raw.description);
    if (raw.emoji !== undefined) builder.setEmoji(raw.emoji);
    if (raw.default !== undefined) builder.setDefault(raw.default);
    return builder;
  }

  /**
   * Gets the option label text.
   * @readonly
   */
  public get label(): string | undefined {
    return this.data.label;
  }

    /**
   * The value returned when this option is selected or text is submitted.
   * @readonly
   */
  public get value(): string | undefined {
    return this.data.value;
  }

  /**
   * Gets the option description text.
   * @readonly
   */
  public get description(): string | undefined {
    return this.data.description;
  }

  /**
   * Gets the option emoji.
   * @readonly
   */
  public get emoji(): APIMessageComponentEmoji | undefined {
    return this.data.emoji;
  }

  /**
   * Gets whether this option is selected by default.
   * @readonly
   */
  public get default(): boolean | undefined {
    return this.data.default;
  }

      /**
   * Creates a new StringSelectMenuOptionBuilder.
   * @param opts - Config options.
   */
constructor(opts?: TypeSafeSelectMenuOption<string, string, string>) {
    if (!opts) return;
    
    const lbl = opts.label as string | undefined;
    if (lbl !== undefined) {
      if (lbl.length > 100) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `label is too long, max is 100 characters but got ${lbl.length}`);
      this.data.label = lbl;
    }
    const val = opts.value as string | undefined;
    if (val !== undefined) {
      if (val.length < 1) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'value needs to be at least 1 character');
      if (val.length > 100) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `value is too long, max is 100 characters but got ${val.length}`);
      this.data.value = val;
    }
    if (opts.description !== undefined) {
      const d = opts.description as string;
      if (d.length > 100) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `description is too long, max is 100 characters but got ${d.length}`);
      this.data.description = d;
    }
    if (opts.emoji !== undefined) this.data.emoji = opts.emoji;
    if (opts.default !== undefined) this.data.default = opts.default;
  }

  /**
   * Sets the label text displayed for this option (maximum of 100 characters).
   * @param lbl The label to set
   * @returns This builder instance
   * @throws If label exceeds 100 characters
   */
  setLabel(lbl: CheckMaxLength<string, 100, 'label'>): this {
    if (lbl.length > 100) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `label is too long, max is 100 characters but got ${lbl.length}`);
    }
    this.data.label = lbl;
    return this;
  }

  /**
   * Sets the option value (maximum of 100 characters).
   * @param val The value to set
   * @returns This builder instance
   * @throws If value is empty or exceeds 100 characters
   */
  setValue(val: CheckMinLength<string, 1, 'value'> & CheckMaxLength<string, 100, 'value'>): this {
    if (val.length < 1) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'value needs to be at least 1 character');
    }
    if (val.length > 100) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `value is too long, max is 100 characters but got ${val.length}`);
    }
    this.data.value = val;
    return this;
  }

  /**
   * Sets the description text for this option (maximum of 100 characters).
   * @param desc The description to set
   * @returns This builder instance
   * @throws If description exceeds 100 characters
   */
  setDescription(desc: CheckMaxLength<string, 100, 'description'>): this {
    if (desc.length > 100) {
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `description is too long, max is 100 characters but got ${desc.length}`);
    }
    this.data.description = desc;
    return this;
  }

  /**
   * Sets the emoji associated with this option.
   * @param emoji The emoji to set
   * @returns This builder instance
   */
  setEmoji(emoji: APIMessageComponentEmoji): this {
    this.data.emoji = emoji;
    return this;
  }

  /**
   * Sets whether this option is checked by default.
   * @param val Whether to set as default
   * @returns This builder instance
   */
  setDefault(val: boolean): this {
    this.data.default = val;
    return this;
  }

  /**
   * Converts this builder to a JSON payload.
   * @returns The JSON representation
   * @throws If label or value is missing
   */
  toJSON(): APISelectMenuOption {
    if (!this.data.label) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'label is required');
    if (!this.data.value) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'value is required');
    return this.data as APISelectMenuOption;
  }
}

/**
 * Interface for a configured StringSelectMenuOptionBuilder.
 */
export interface StringSelectMenuOptionBuilderInstance
  extends StringSelectMenuOptionBuilderClass {}

export const StringSelectMenuOptionBuilder =
  StringSelectMenuOptionBuilderClass as unknown as {
    new <
      Label extends string = string,
      Value extends string = string,
      Description extends string = string,
    >(
      opts?: TypeSafeSelectMenuOption<Label, Value, Description>,
    ): StringSelectMenuOptionBuilderInstance;
    from(data: APISelectMenuOption): StringSelectMenuOptionBuilder;
  };

/**
 * Alias for StringSelectMenuOptionBuilderClass.
 */
export type StringSelectMenuOptionBuilder =
  StringSelectMenuOptionBuilderClass;

/**
 * Config options for a new StringSelectMenuBuilder.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template Options The options contained in the select menu.
 * @template MinValues The minimum selected options range.
 * @template MaxValues The maximum selected options range.
 */
export interface StringSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  Options extends readonly (
    | TypeSafeSelectMenuOption
    | StringSelectMenuOptionBuilder
  )[] = readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
  MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
  MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
> {
  /** The list of selectable choices (1-25 options allowed). */
  options?: readonly [...Options];
  /** Placeholder text when nothing is selected (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** Max checked options allowed (1 to 25). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

type GetStringSelectOptions<Opts> = Opts extends { options: infer O } ? (O extends readonly unknown[] ? O : never) : never;

type GetSelectMinValues<Opts> =
  Opts extends { minValues: infer M }
  ? M
  : Opts extends { min_values: infer M }
  ? M
  : never;

type GetSelectMaxValues<Opts> =
  Opts extends { maxValues: infer M }
  ? M
  : Opts extends { max_values: infer M }
  ? M
  : never;

type ValidateSelectValues<Opts> =
  [GetSelectMinValues<Opts>] extends [never]
  ? unknown
  : [GetSelectMaxValues<Opts>] extends [never]
  ? unknown
  : IsLessThanOrEqual<GetSelectMinValues<Opts> & number, GetSelectMaxValues<Opts> & number> extends true
  ? unknown
  : { readonly error: 'minValues cannot be greater than maxValues' };

/**
 * Validates the generic parameters of generic SelectMenuOptions at compile-time.
 * @template Opts The user configuration options.
 */
export type ValidateSelectMenuOptions<Opts> =
  CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : (GetCustomIdField<Opts> extends never
      ? (Opts extends { placeholder: string }
          ? CheckStringConstraints<Opts['placeholder'], 1, 150, 'placeholder'> extends { readonly error: string }
            ? CheckStringConstraints<Opts['placeholder'], 1, 150, 'placeholder'>
            : ValidateSelectValues<Opts>
          : ValidateSelectValues<Opts>)
      : Opts extends { placeholder: string }
      ? CheckStringConstraints<Opts['placeholder'], 1, 150, 'placeholder'> extends { readonly error: string }
        ? CheckStringConstraints<Opts['placeholder'], 1, 150, 'placeholder'>
        : ValidateSelectValues<Opts>
      : ValidateSelectValues<Opts>);

/**
 * Type-level validation for StringSelectMenuOptions.
 * @template Opts The user configuration options.
 */
export type ValidateStringSelectMenuOptions<Opts> =
  ValidateSelectMenuOptions<Opts> extends { readonly error: string }
  ? ValidateSelectMenuOptions<Opts>
  : Opts extends { options: unknown }
  ? [GetStringSelectOptions<Opts>] extends [never]
    ? { readonly error: 'options must be a valid array' }
    : CheckArrayLength<GetStringSelectOptions<Opts>, 1, 25, 'options'> extends { readonly error: string }
    ? CheckArrayLength<GetStringSelectOptions<Opts>, 1, 25, 'options'>
    : unknown
  : unknown;

/**
 * Interface for a fully configured StringSelectMenuBuilder.
 * @template CustomId The custom ID of the select menu.
 * @template Options The options contained in the select menu.
 */
export interface StringSelectMenuBuilderInstance<
  CustomId extends string,
  Options extends readonly (
    | TypeSafeSelectMenuOption
    | StringSelectMenuOptionBuilder
  )[] = readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
> extends StringSelectMenuBuilderClass {
  /** Custom ID of this select menu. */
  readonly customId: CustomId;
  /** The options configured in the select menu. */
  readonly options: Options;
}

/**
 * Builds a String Select Menu component (type 3).
 * Lets users pick one or more text options from a predefined dropdown list (1-25 options).
 *
 * Options can be plain objects (`TypeSafeSelectMenuOption`) or
 * `StringSelectMenuOptionBuilder` instances. Supports min/max values,
 * placeholder text, and disabled state.
 *
 * @example
 * ```ts
 * const menu = new StringSelectMenuBuilder({
 *   customId: 'snayz_projects_dropdown',
 *   placeholder: 'Select a Snayz project on Discord...',
 *   options: [
 *     new StringSelectMenuOptionBuilder({ label: 'buncord-builders', value: 'builders' }),
 *     new StringSelectMenuOptionBuilder({ label: 'Others Project', value: 'other' }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://docs.discord.com/developers/components/reference#string-select Discord Docs - String Select}
 */
class StringSelectMenuBuilderClass extends BaseSelectMenuBuilderClass<Partial<APIStringSelectComponent>> {
  public override readonly type = ComponentType.StringSelect;

  /**
   * Recreates a StringSelectMenuBuilder from a raw API payload.
   * @param data Raw string select menu data payload
   * @returns A new StringSelectMenuBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIStringSelectComponent): StringSelectMenuBuilderClass {
    const raw = resolveRaw(data) as unknown as APIStringSelectComponent;
    const builder = new StringSelectMenuBuilderClass({
      customId: raw.custom_id,
    } as unknown as StringSelectMenuOptions<string, string, (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]>);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.options) {
      const optsRaw = raw.options;
      const len = optsRaw.length;
      const opts = new Array<StringSelectMenuOptionBuilder>(len);
      for (let i = 0; i < len; i++) {
        opts[i] = StringSelectMenuOptionBuilder.from(optsRaw[i]!);
      }
      builder.setOptions(opts);
    }
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the select menu options list.
   * @readonly
   */
  public get options(): readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[] {
    return (this.data.options ?? []) as unknown as readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[];
  }

  constructor(
    opts?: StringSelectMenuOptions<
      string,
      string,
      (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]
    >,
  ) {
    if (!opts) {
      super({
        type: ComponentType.StringSelect,
        options: [],
      } as unknown as Partial<APIStringSelectComponent>);
      return;
    }

    const options = opts.options;
    if (options !== undefined) {
      const optLen = options.length;
      if (optLen < MIN_OPTIONS || optLen > MAX_OPTIONS) {
        throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', `options needs between ${MIN_OPTIONS} and ${MAX_OPTIONS} elements, but got ${optLen}`);
      }
    }

    const payload: Record<string, unknown> = {
      type: ComponentType.StringSelect,
      options: options ?? [],
    };
    initSelectMenuPayload(payload, opts);

    super(payload as unknown as Partial<APIStringSelectComponent>);
  }

  /**
   * Replaces the options list (must contain between 1 and 25 options).
   * @param options Array of options to set
   * @returns This builder instance
   * @throws If options count is not between 1 and 25
   */
  setOptions(
    options: (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
  ): this {
    this.validateArrayLength(options, 1, 25, 'options');
    this.data.options = options as unknown as APISelectMenuOption[];
    return this;
  }

  /**
   * Appends options to the menu (maximum of 25 options total).
   * @param options Options to add
   * @returns This builder instance
   * @throws If total options would exceed 25
   */
  addOptions(
    ...options: (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]
  ): this {
    if (!this.data.options) this.data.options = [];
    const cur = this.data.options.length;
    const add = options.length;
    if (cur + add > 25)
      throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', "options size can't be more than 25");
    for (let i = 0; i < add; i++) {
      this.data.options.push(options[i] as unknown as APISelectMenuOption);
    }
    return this;
  }

  /**
   * Splices select menu options.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param options Options to insert
   * @returns This builder instance
   * @throws If result would not have between 1 and 25 options
   */
  spliceOptions(
    index: number,
    deleteCount: number,
    ...options: (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]
  ): this {
    if (!this.data.options) this.data.options = [];
    (this.data.options as unknown as (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]).splice(index, deleteCount, ...options);
    this.validateArrayLength(this.data.options, 1, 25, 'options');
    return this;
  }

  /**
   * Serializes this string select menu to the raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APIStringSelectComponent {
    this.validateSerialization();
    const data = this.data;
    const options = data.options;
    const serialized = serializeEntries<APISelectMenuOption>(options);
    this.validateArrayLength(serialized, MIN_OPTIONS, MAX_OPTIONS, 'options');
    for (let i = 0; i < serialized.length; i++) validateOptionFields(serialized[i]!);

    // Plain option objects are already wire-ready, so nothing has to be copied.
    if (serialized === (options as unknown)) return data as APIStringSelectComponent;

    return { ...data, options: serialized } as APIStringSelectComponent;
  }
}

export const StringSelectMenuBuilder =
  StringSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
      Options extends readonly (
        | TypeSafeSelectMenuOption
        | StringSelectMenuOptionBuilder
      )[] = readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
      MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      Opts extends StringSelectMenuOptions<CustomId, Placeholder, Options, MinValues, MaxValues> = StringSelectMenuOptions<CustomId, Placeholder, Options, MinValues, MaxValues>,
    >(
      opts?: Opts & ValidateStringSelectMenuOptions<Opts> & ValidateSelectMenuRequired<Opts>,
    ): StringSelectMenuBuilderInstance<ExtractCustomId<Opts>, GetStringSelectOptions<Opts>>;
    from(data: APIStringSelectComponent): StringSelectMenuBuilder;
  };
export type StringSelectMenuBuilder = StringSelectMenuBuilderClass;

/**
 * Base options for auto-populated select menus.
 * @template Placeholder The placeholder text string literal.
 */
export interface BaseAutoSelectMenuOptions<
  Placeholder extends string = string,
> {
  /** Placeholder text when nothing is selected (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: AllowedSelectMenuRange;
  /** Alias for minValues. */
  min_values?: AllowedSelectMenuRange;
  /** Max checked options allowed (1 to 25). */
  maxValues?: AllowedSelectMenuRange;
  /** Alias for maxValues. */
  max_values?: AllowedSelectMenuRange;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
}

/**
 * Common base class for auto-populated select menus (User, Role, Mentionable, Channel).
 */
abstract class BaseAutoSelectMenuBuilderClass<
  TData extends Partial<APIBaseSelectMenuComponent> = Partial<APIBaseSelectMenuComponent>,
> extends BaseSelectMenuBuilderClass<TData> {
  constructor(data?: TData) {
    super(data);
  }
  /** The `default_values` types this menu accepts. */
  protected abstract readonly allowedDefaultTypes: readonly string[];

  /**
   * Gets the list of default pre-selected values for this select menu.
   * @readonly
   */
  public get defaultValues(): readonly APISelectMenuDefaultValue[] {
    return (this.data as Record<string, unknown>).default_values as APISelectMenuDefaultValue[] ?? [];
  }

  protected initAuto(
    opts: BaseAutoSelectMenuOptions<string> & {
      customId?: string;
      custom_id?: string;
    },
  ): void {
    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw componentValidationError('SELECT_MENU_VALIDATION_FAILED', 'customId is required');
    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;
    this.initCommon(cid, opts.placeholder as string | undefined, min, max, opts.disabled, opts.required);
  }

      /**
   * Sets the minimum number of selected choices required (between 0 and 25).
   * Overrides to revalidate default values.
   * @param min - The minimum values count to set.
   * @returns This builder for chaining.
   */
override setMinValues(min: number): this {
    super.setMinValues(min);
    if ((this.data as Record<string, unknown>).default_values) {
      this.validateDefaultValues(
        (this.data as Record<string, unknown>).default_values as APISelectMenuDefaultValue[],
        this.allowedDefaultTypes,
        min,
        this.data.max_values,
      );
    }
    return this;
  }

      /**
   * Sets the maximum number of selected choices allowed (between 1 and 25).
   * Overrides to revalidate default values.
   * @param max - The maximum values count to set.
   * @returns This builder for chaining.
   */
override setMaxValues(max: number): this {
    super.setMaxValues(max);
    if ((this.data as Record<string, unknown>).default_values) {
      this.validateDefaultValues(
        (this.data as Record<string, unknown>).default_values as APISelectMenuDefaultValue[],
        this.allowedDefaultTypes,
        this.data.min_values,
        max,
      );
    }
    return this;
  }

  /**
   * Replaces the default values after validating them.
   * An empty list clears the field so the payload never carries an empty array.
   */
  protected setDefaultValuesRaw(entries: readonly APISelectMenuDefaultValue[]): void {
    const data = this.data as Record<string, unknown>;
    if (entries.length === 0) {
      delete data.default_values;
      return;
    }
    this.validateDefaultValues(
      entries,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    data.default_values = entries;
  }

  /**
   * Appends default values after validating the resulting list.
   */
  protected addDefaultValuesRaw(entries: readonly APISelectMenuDefaultValue[]): void {
    if (entries.length === 0) return;

    const data = this.data as Record<string, unknown>;
    const existing = (data.default_values as APISelectMenuDefaultValue[] | undefined) ?? [];
    const merged = new Array<APISelectMenuDefaultValue>(existing.length + entries.length);
    for (let i = 0; i < existing.length; i++) merged[i] = existing[i]!;
    for (let i = 0; i < entries.length; i++) merged[existing.length + i] = entries[i]!;

    this.validateDefaultValues(
      merged,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    data.default_values = merged;
  }

}

/**
 * Config options for a new UserSelectMenuBuilder.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template MinValues The minimum selected options range.
 * @template MaxValues The maximum selected options range.
 */
export interface UserSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
  MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
> {
  /** Placeholder when empty (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** Max checked options allowed (1 to 25). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

/**
 * Interface for a configured UserSelectMenuBuilder.
 * @template CustomId The custom ID of the select menu.
 */
export interface UserSelectMenuBuilderInstance<CustomId extends string>
  extends UserSelectMenuBuilderClass {
  /** Custom ID of this select menu. */
  readonly customId: CustomId;
}

/**
 * Represents a User Select Menu component (type 5).
 * Allows users to choose one or more users from the Discord guild.
 * 
 * @example
 * ```ts
 * const menu = new UserSelectMenuBuilder({
 *   customId: 'mention_snayz',
 *   placeholder: 'Select a developer like Snayz to mention on Discord...',
 * });
 * ```
 */
class UserSelectMenuBuilderClass extends BaseAutoSelectMenuBuilderClass<Partial<APIUserSelectComponent>> {
  public override readonly type = ComponentType.UserSelect;

  protected override readonly allowedDefaultTypes = USER_DEFAULT_TYPES;

  /**
   * Recreates a UserSelectMenuBuilder from a raw API payload.
   * @param data Raw user select menu data payload
   * @returns A new UserSelectMenuBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIUserSelectComponent): UserSelectMenuBuilderClass {
    const raw = resolveRaw(data) as unknown as APIUserSelectComponent;
    const builder = new UserSelectMenuBuilderClass({
      customId: raw.custom_id,
    } as unknown as UserSelectMenuOptions<string, string>);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultUsers(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  constructor(opts?: UserSelectMenuOptions<string, string>) {
    if (!opts) {
      super({ type: ComponentType.UserSelect } as unknown as Partial<APIUserSelectComponent>);
      return;
    }

    const payload: Record<string, unknown> = { type: ComponentType.UserSelect };
    initSelectMenuPayload(payload, opts);

    super(payload as unknown as Partial<APIUserSelectComponent>);
  }

  setDefaultUsers(users: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.setDefaultValuesRaw(toDefaultValues(users, SelectMenuDefaultValueType.User));
    return this;
  }

  /**
   * Sets default pre-selected users (maximum of 25 values).
   * @param users Users to set as default
   * @returns This builder instance
   * @throws If default values count exceeds 25 or violates min/max constraints
   */
  addDefaultUsers(...users: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = toDefaultValues(users, SelectMenuDefaultValueType.User);
    this.addDefaultValuesRaw(vals);
    return this;
  }

      /**
   * Serializes the UserSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIUserSelectComponent {
    this.validateSerialization();
    return this.data as unknown as APIUserSelectComponent;
  }
}

export const UserSelectMenuBuilder = UserSelectMenuBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Placeholder extends string = string,
    MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
    MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
    Opts extends UserSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues> = UserSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues>,
  >(
    opts?: Opts & ValidateSelectMenuOptions<Opts> & ValidateSelectMenuRequired<Opts>,
  ): UserSelectMenuBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APIUserSelectComponent): UserSelectMenuBuilder;
};
export type UserSelectMenuBuilder = UserSelectMenuBuilderClass;

/**
 * Config options for a new RoleSelectMenuBuilder.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template MinValues The minimum selected options range.
 * @template MaxValues The maximum selected options range.
 */
export interface RoleSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
  MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
> {
  /** Placeholder when empty (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** Max checked options allowed (1 to 25). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

/**
 * Interface for a configured RoleSelectMenuBuilder.
 * @template CustomId The custom ID of the select menu.
 */
export interface RoleSelectMenuBuilderInstance<CustomId extends string>
  extends RoleSelectMenuBuilderClass {
  /** Custom ID of this select menu. */
  readonly customId: CustomId;
}

/**
 * Represents a Role Select Menu component (type 6).
 * Allows users to choose one or more roles from the Discord guild.
 * 
 * @example
 * ```ts
 * const menu = new RoleSelectMenuBuilder({
 *   customId: 'role_picker_snayz',
 *   placeholder: 'Select a project role in buncord-builders...',
 * });
 * ```
 */
class RoleSelectMenuBuilderClass extends BaseAutoSelectMenuBuilderClass<Partial<APIRoleSelectComponent>> {
  public override readonly type = ComponentType.RoleSelect;

  protected override readonly allowedDefaultTypes = ROLE_DEFAULT_TYPES;

  /**
   * Recreates a RoleSelectMenuBuilder from a raw API payload.
   * @param data Raw role select menu data payload
   * @returns A new RoleSelectMenuBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIRoleSelectComponent): RoleSelectMenuBuilderClass {
    const raw = resolveRaw(data) as unknown as APIRoleSelectComponent;
    const builder = new RoleSelectMenuBuilderClass({
      customId: raw.custom_id,
    } as unknown as RoleSelectMenuOptions<string, string>);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultRoles(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  constructor(opts?: RoleSelectMenuOptions<string, string>) {
    if (!opts) {
      super({ type: ComponentType.RoleSelect } as unknown as Partial<APIRoleSelectComponent>);
      return;
    }

    const payload: Record<string, unknown> = { type: ComponentType.RoleSelect };
    initSelectMenuPayload(payload, opts);

    super(payload as unknown as Partial<APIRoleSelectComponent>);
  }

  setDefaultRoles(roles: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.setDefaultValuesRaw(toDefaultValues(roles, SelectMenuDefaultValueType.Role));
    return this;
  }

  /**
   * Appends roles to the list of default pre-selected roles.
   * @param roles - Role IDs or pre-selected role value objects to add.
   * @returns This builder for chaining.
   */
  addDefaultRoles(...roles: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = toDefaultValues(roles, SelectMenuDefaultValueType.Role);
    this.addDefaultValuesRaw(vals);
    return this;
  }

      /**
   * Serializes the RoleSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIRoleSelectComponent {
    this.validateSerialization();
    return this.data as unknown as APIRoleSelectComponent;
  }
}

export const RoleSelectMenuBuilder = RoleSelectMenuBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Placeholder extends string = string,
    MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
    MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
    Opts extends RoleSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues> = RoleSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues>,
  >(
    opts?: Opts & ValidateSelectMenuOptions<Opts> & ValidateSelectMenuRequired<Opts>,
  ): RoleSelectMenuBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APIRoleSelectComponent): RoleSelectMenuBuilder;
};
export type RoleSelectMenuBuilder = RoleSelectMenuBuilderClass;

/**
 * Config options for a new MentionableSelectMenuBuilder.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template MinValues The minimum selected options range.
 * @template MaxValues The maximum selected options range.
 */
export interface MentionableSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
  MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
> {
  /** Placeholder when empty (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** Max checked options allowed (1 to 25). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

/**
 * Interface for a configured MentionableSelectMenuBuilder.
 * @template CustomId The custom ID of the select menu.
 */
export interface MentionableSelectMenuBuilderInstance<CustomId extends string>
  extends MentionableSelectMenuBuilderClass {
  /** Custom ID of this select menu. */
  readonly customId: CustomId;
}

/**
 * Represents a Mentionable Select Menu component (type 7).
 * Allows users to choose users or roles from the Discord guild.
 * 
 * @example
 * ```ts
 * const menu = new MentionableSelectMenuBuilder({
 *   customId: 'notify_snayz_team',
 *   placeholder: 'Select Snayz or other Discord developers to notify...',
 * });
 * ```
 */
class MentionableSelectMenuBuilderClass extends BaseAutoSelectMenuBuilderClass<Partial<APIMentionableSelectComponent>> {
  public override readonly type = ComponentType.MentionableSelect;

  protected override readonly allowedDefaultTypes = MENTIONABLE_DEFAULT_TYPES;

  /**
   * Recreates a MentionableSelectMenuBuilder from a raw API payload.
   * @param data Raw mentionable select menu data payload
   * @returns A new MentionableSelectMenuBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIMentionableSelectComponent): MentionableSelectMenuBuilderClass {
    const raw = resolveRaw(data) as unknown as APIMentionableSelectComponent;
    const builder = new MentionableSelectMenuBuilderClass({
      customId: raw.custom_id,
    } as unknown as MentionableSelectMenuOptions<string, string>);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultValues(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  constructor(opts?: MentionableSelectMenuOptions<string, string>) {
    if (!opts) {
      super({ type: ComponentType.MentionableSelect } as unknown as Partial<APIMentionableSelectComponent>);
      return;
    }

    const payload: Record<string, unknown> = { type: ComponentType.MentionableSelect };
    initSelectMenuPayload(payload, opts);

    super(payload as unknown as Partial<APIMentionableSelectComponent>);
  }

  /**
   * Sets default pre-selected users and roles (maximum of 25 values).
   * @param values Default values to set
   * @returns This builder instance
   * @throws If default values count exceeds 25 or violates min/max constraints
   */
  setDefaultValues(values: readonly APISelectMenuDefaultValue[]): this {
    this.setDefaultValuesRaw(toDefaultValues(values, SelectMenuDefaultValueType.User));
    return this;
  }

  /**
   * Appends pre-selected mentionable items.
   * @param values Values to add
   * @returns This builder instance
   * @throws If default values count would exceed 25
   */
  addDefaultValues(...values: readonly APISelectMenuDefaultValue[]): this {
    this.addDefaultValuesRaw(values);
    return this;
  }

      /**
   * Appends users to the list of default pre-selected mentionables.
   * @param users - User IDs or pre-selected user value objects to add.
   * @returns This builder for chaining.
   */
  addDefaultUsers(...users: readonly (string | { id: string })[]): this {
    const vals = toDefaultValues(users, SelectMenuDefaultValueType.User);
    this.addDefaultValuesRaw(vals);
    return this;
  }

      /**
   * Appends roles to the list of default pre-selected roles.
   * @param roles - Role IDs or pre-selected role value objects to add.
   * @returns This builder for chaining.
   */
  addDefaultRoles(...roles: readonly (string | { id: string })[]): this {
    const vals = toDefaultValues(roles, SelectMenuDefaultValueType.Role);
    this.addDefaultValuesRaw(vals);
    return this;
  }

      /**
   * Serializes the MentionableSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIMentionableSelectComponent {
    this.validateSerialization();
    return this.data as unknown as APIMentionableSelectComponent;
  }
}

export const MentionableSelectMenuBuilder =
  MentionableSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
      MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      Opts extends MentionableSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues> = MentionableSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues>,
    >(
      opts?: Opts & ValidateSelectMenuOptions<Opts> & ValidateSelectMenuRequired<Opts>,
    ): MentionableSelectMenuBuilderInstance<ExtractCustomId<Opts>>;
    from(data: APIMentionableSelectComponent): MentionableSelectMenuBuilder;
  };
export type MentionableSelectMenuBuilder = MentionableSelectMenuBuilderClass;

/**
 * Config options for a new ChannelSelectMenuBuilder.
 * @template CustomId The custom ID string literal.
 * @template Placeholder The placeholder text string literal.
 * @template MinValues The minimum selected options range.
 * @template MaxValues The maximum selected options range.
 */
export interface ChannelSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
  MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
> {
  /** Allowed channel types for selection. */
  channelTypes?: ChannelType[];
  /** Alias for channelTypes. */
  channel_types?: ChannelType[];
  /** Placeholder when empty (up to 150 chars). */
  placeholder?: Placeholder;
  /** Min checked options required (0 to 25). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** Max checked options allowed (1 to 25). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Disable the select menu? */
  disabled?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

/**
 * Interface for a configured ChannelSelectMenuBuilder.
 * @template CustomId The custom ID of the select menu.
 */
export interface ChannelSelectMenuBuilderInstance<CustomId extends string>
  extends ChannelSelectMenuBuilderClass {
  /** Custom ID of this select menu. */
  readonly customId: CustomId;
}

/**
 * Represents a Channel Select Menu component (type 8).
 * Allows users to choose one or more channels from the guild, filtered by channel type.
 * 
 * @example
 * ```ts
 * const menu = new ChannelSelectMenuBuilder({
 *   customId: 'snayz_channel_picker',
 *   placeholder: 'Select a Discord text channel for Snayz...',
 *   channelTypes: [ChannelType.GuildText],
 * });
 * ```
 */
class ChannelSelectMenuBuilderClass extends BaseAutoSelectMenuBuilderClass<Partial<APIChannelSelectComponent>> {
  public override readonly type = ComponentType.ChannelSelect;

  protected override readonly allowedDefaultTypes = CHANNEL_DEFAULT_TYPES;

  /**
   * Recreates a ChannelSelectMenuBuilder from a raw API payload.
   * @param data Raw channel select menu data payload
   * @returns A new ChannelSelectMenuBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIChannelSelectComponent): ChannelSelectMenuBuilderClass {
    const raw = resolveRaw(data) as unknown as APIChannelSelectComponent;
    const builder = new ChannelSelectMenuBuilderClass({
      customId: raw.custom_id,
    } as unknown as ChannelSelectMenuOptions<string, string>);
    if (raw.placeholder !== undefined) builder.setPlaceholder(raw.placeholder);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.channel_types) builder.setChannelTypes(raw.channel_types);
    if (raw.default_values) builder.setDefaultChannels(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the channel types filtering this select menu.
   * @readonly
   */
  public get channelTypes(): readonly ChannelType[] {
    return this.data.channel_types ?? [];
  }

  constructor(opts?: ChannelSelectMenuOptions<string, string>) {
    if (!opts) {
      super({ type: ComponentType.ChannelSelect } as unknown as Partial<APIChannelSelectComponent>);
      return;
    }

    const payload: Record<string, unknown> = { type: ComponentType.ChannelSelect };
    initSelectMenuPayload(payload, opts);

    const types = opts.channelTypes ?? opts.channel_types;
    if (types !== undefined) payload.channel_types = types.slice();

    super(payload as unknown as Partial<APIChannelSelectComponent>);
  }

  /**
   * Limits selectable channels to specific channel types.
   * @param channelTypes Array of channel types to allow
   * @returns This builder instance
   */
  setChannelTypes(channelTypes: readonly ChannelType[]): this {
    if (channelTypes.length === 0) {
      delete this.data.channel_types;
      return this;
    }
    this.data.channel_types = channelTypes.slice();
    return this;
  }

      /**
   * Adds allowed channel types to filter the channel list.
   * @param channelTypes - The channel types to allow.
   * @returns This builder for chaining.
   */
  addChannelTypes(...channelTypes: readonly ChannelType[]): this {
    if (channelTypes.length === 0) return this;

    let current = this.data.channel_types;
    if (!Array.isArray(current)) {
      current = [];
      this.data.channel_types = current;
    }
    for (let i = 0; i < channelTypes.length; i++) current.push(channelTypes[i]!);
    return this;
  }

        /**
   * Sets the default pre-selected channels for this select menu (up to 25 entries).
   * @param channels - Channel IDs or pre-selected channel value objects.
   * @returns This builder for chaining.
   */
  setDefaultChannels(channels: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.setDefaultValuesRaw(toDefaultValues(channels, SelectMenuDefaultValueType.Channel));
    return this;
  }

      /**
   * Appends channels to the list of default pre-selected channels.
   * @param channels - Channel IDs or pre-selected channel value objects to add.
   * @returns This builder for chaining.
   */
  addDefaultChannels(...channels: readonly (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = toDefaultValues(channels, SelectMenuDefaultValueType.Channel);
    this.addDefaultValuesRaw(vals);
    return this;
  }

      /**
   * Serializes the ChannelSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIChannelSelectComponent {
    this.validateSerialization();
    return this.data as unknown as APIChannelSelectComponent;
  }
}

export const ChannelSelectMenuBuilder =
  ChannelSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
      MinValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      MaxValues extends AllowedSelectMenuRange = AllowedSelectMenuRange,
      Opts extends ChannelSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues> = ChannelSelectMenuOptions<CustomId, Placeholder, MinValues, MaxValues>,
    >(
      opts?: Opts & ValidateSelectMenuOptions<Opts> & ValidateSelectMenuRequired<Opts>,
    ): ChannelSelectMenuBuilderInstance<ExtractCustomId<Opts>>;
    from(data: APIChannelSelectComponent): ChannelSelectMenuBuilder;
  };
export type ChannelSelectMenuBuilder = ChannelSelectMenuBuilderClass;

/** @deprecated Use StringSelectMenuBuilder instead */
export const SelectMenuBuilder = StringSelectMenuBuilder;
/** @deprecated Use StringSelectMenuBuilder instead */
export type SelectMenuBuilder = StringSelectMenuBuilder;
