import { componentValidationError } from '../utils/ComponentError.ts';
import { ComponentType } from '../enums.ts';
import type { APIRadioGroupComponent, APIRadioGroupOption } from '../types.ts';
import type {
  CheckArrayLength,
  CheckMaxLength,
  CheckMinLength,
  ExtractCustomId,
  GetCustomIdField,
  CheckStringConstraints,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw, serializeEntries } from './base.ts';
import { validateOptionFields } from '../utils/OptionValidation.ts';

/** Bounds of a radio group's option list. */
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

/**
 * Config options for a new RadioGroupOptionBuilder.
 * @template Value The value string literal.
 * @template Label The label string literal.
 * @template Description The description string literal.
 */
export interface RadioGroupOptionOptions<
  Value extends string = string,
  Label extends string = string,
  Description extends string = string,
> {
  /** The value returned when this option is selected (max 100 characters). */
  value?: Value & CheckMinLength<Value, 1, 'value'> & CheckMaxLength<Value, 100, 'value'>;
  /** The user-facing label text of the option (max 100 characters). */
  label?: Label & CheckMaxLength<Label, 100, 'label'>;
  /** An optional description displayed under the label (max 100 characters). */
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  /** Whether this radio choice starts selected by default. */
  default?: boolean;
}

/**
 * Config options for a new RadioGroupBuilder.
 * @template CustomId The custom ID string literal.
 * @template Options The radio option builders array.
 */
export interface RadioGroupOptions<
  CustomId extends string = string,
  Options extends readonly RadioGroupOptionBuilder[] = readonly RadioGroupOptionBuilder[],
> {
  /** The list of radio choices (2-10 options allowed). */
  options?: readonly [...Options];
  /** Is selection required? Defaults to true. */
  required?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

type GetRadioOptions<Opts> = Opts extends { options: infer O } ? (O extends readonly unknown[] ? O : never) : never;

/**
 * Type-level validation for RadioGroupOptions.
 * @template Opts The user configuration options object.
 */
export type ValidateRadioGroupOptions<Opts> =
  CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : Opts extends { options: unknown }
  ? ([GetRadioOptions<Opts>] extends [never]
      ? { readonly error: 'options must be a valid array' }
      : CheckArrayLength<GetRadioOptions<Opts>, 2, 10, 'options'> extends { readonly error: string }
      ? CheckArrayLength<GetRadioOptions<Opts>, 2, 10, 'options'>
      : unknown)
  : unknown;

/**
 * Represents an option within a Radio Group component.
 */
class RadioGroupOptionBuilderClass {
  public data: Partial<APIRadioGroupOption> = {};

  /**
   * Recreates a RadioGroupOptionBuilder from a raw API payload.
   * @param data Raw radio group option data payload
   * @returns A new RadioGroupOptionBuilderClass instance
   */
  public static from(data: APIRadioGroupOption): RadioGroupOptionBuilderClass {
    const raw = resolveRaw(data) as unknown as APIRadioGroupOption;
    const builder = new RadioGroupOptionBuilderClass({
      value: raw.value,
      label: raw.label,
    } as unknown as RadioGroupOptionOptions<string, string, string>);
    if (raw.description !== undefined) builder.setDescription(raw.description);
    if (raw.default !== undefined) builder.setDefault(raw.default);
    return builder;
  }

    /**
   * The value returned when this option is selected or text is submitted.
   * @readonly
   */
  public get value(): string | undefined {
    return this.data.value;
  }

  /**
   * Gets the option label.
   * @readonly
   */
  public get label(): string | undefined {
    return this.data.label;
  }

  /**
   * Gets the option description.
   * @readonly
   */
  public get description(): string | undefined {
    return this.data.description;
  }

  /**
   * Gets whether this option is selected by default.
   * @readonly
   */
  public get default(): boolean | undefined {
    return this.data.default;
  }

  /**
   * Creates a new RadioGroupOptionBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: RadioGroupOptionOptions<string, string, string>) {
    if (!opts) return;
    const val = opts.value as string | undefined;
    if (val !== undefined) {
      if (val.length < 1) throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', 'value needs to be at least 1 character');
      if (val.length > 100) throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `value is too long, max is 100 characters but got ${val.length}`);
      this.data.value = val;
    }
    const lbl = opts.label as string | undefined;
    if (lbl !== undefined) {
      if (lbl.length > 100) throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `label is too long, max is 100 characters but got ${lbl.length}`);
      this.data.label = lbl;
    }
    if (opts.description !== undefined) {
      const d = opts.description as string;
      if (d.length > 100) throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `description is too long, max is 100 characters but got ${d.length}`);
      this.data.description = d;
    }
    if (opts.default !== undefined) this.data.default = opts.default;
  }

  /**
   * Sets the option value (maximum of 100 characters).
   * @param val The value to set
   * @returns This builder instance
   * @throws If value is empty or exceeds 100 characters
   */
  setValue(val: CheckMinLength<string, 1, 'value'> & CheckMaxLength<string, 100, 'value'>): this {
    if (val.length < 1) {
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', 'value needs to be at least 1 character');
    }
    if (val.length > 100) {
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `value is too long, max is 100 characters but got ${val.length}`);
    }
    this.data.value = val;
    return this;
  }

  /**
   * Sets the option label (maximum of 100 characters).
   * @param lbl The label to set
   * @returns This builder instance
   * @throws If label exceeds 100 characters
   */
  setLabel(lbl: CheckMaxLength<string, 100, 'label'>): this {
    if (lbl.length > 100) {
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `label is too long, max is 100 characters but got ${lbl.length}`);
    }
    this.data.label = lbl;
    return this;
  }

  /**
   * Sets the option description (maximum of 100 characters).
   * @param desc The description to set
   * @returns This builder instance
   * @throws If description exceeds 100 characters
   */
  setDescription(desc: CheckMaxLength<string, 100, 'description'>): this {
    if (desc.length > 100) {
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `description is too long, max is 100 characters but got ${desc.length}`);
    }
    this.data.description = desc;
    return this;
  }

  /**
   * Sets whether this option is selected by default.
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
   * @throws If value or label is missing
   */
  toJSON(): APIRadioGroupOption {
    validateOptionFields(this.data);
    return this.data as APIRadioGroupOption;
  }
}

/**
 * Interface for a configured RadioGroupOptionBuilder.
 */
export interface RadioGroupOptionBuilderInstance
  extends RadioGroupOptionBuilderClass {}

export const RadioGroupOptionBuilder =
  RadioGroupOptionBuilderClass as unknown as {
    new <
      Value extends string = string,
      Label extends string = string,
      Description extends string = string,
    >(
      opts?: RadioGroupOptionOptions<Value, Label, Description>,
    ): RadioGroupOptionBuilderInstance;
    from(data: APIRadioGroupOption): RadioGroupOptionBuilder;
  };

/**
 * Alias for RadioGroupOptionBuilderClass.
 */
export type RadioGroupOptionBuilder = RadioGroupOptionBuilderClass;

/**
 * Interface for a fully configured RadioGroupBuilder.
 * @template CustomId The custom ID of the radio group.
 * @template Options The options contained in the radio group.
 */
export interface RadioGroupBuilderInstance<
  CustomId extends string,
  Options extends readonly RadioGroupOptionBuilder[] = readonly RadioGroupOptionBuilder[],
> extends RadioGroupBuilderClass {
  /** The configured custom identifier of the radio group. */
  readonly customId: CustomId;
  /** The radio options configured in the group. */
  readonly options: Options;
}

/**
 * Builds a Radio Group component (type 21) for use inside modal forms.
 * Lets users select **exactly one** option from a predefined list (2-10 options required).
 *
 * Each option can be pre-selected by setting its `default` property.
 *
 * **Modal-only**: wrap in a {@link LabelBuilder} to show a label.
 *
 * @example
 * ```ts
 * const radioGroup = new RadioGroupBuilder({
 *   customId: 'theme_select',
 *   options: [
 *     new RadioGroupOptionBuilder({ value: 'dark', label: 'Discord Dark', default: true }),
 *     new RadioGroupOptionBuilder({ value: 'light', label: 'Discord Light' }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://docs.discord.com/developers/components/reference#radio-group Discord Docs - Radio Button Group}
 */
class RadioGroupBuilderClass extends BaseComponent<Partial<APIRadioGroupComponent>> {
  public override readonly type = ComponentType.RadioGroup;

  /**
   * Recreates a RadioGroupBuilder from a raw API payload.
   * @param data Raw radio group data payload
   * @returns A new RadioGroupBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APIRadioGroupComponent): RadioGroupBuilderClass {
    const raw = resolveRaw(data) as unknown as APIRadioGroupComponent;
    const opts = (raw.options ?? []).map((o) => RadioGroupOptionBuilder.from(o));
    const builder = new RadioGroupBuilderClass({
      customId: raw.custom_id,
      options: opts,
    } as unknown as RadioGroupOptions<string, RadioGroupOptionBuilderClass[]>);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the custom identifier of the radio group.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Gets whether choice selection is required.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }

  /**
   * Gets the list of options in the group.
   * @readonly
   */
  public get options(): readonly RadioGroupOptionBuilder[] {
    return (this.data.options ?? []) as unknown as readonly RadioGroupOptionBuilder[];
  }

  /**
   * Creates a new RadioGroupBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: RadioGroupOptions<string, RadioGroupOptionBuilder[]>) {
    if (!opts) {
      super({
        type: ComponentType.RadioGroup,
        options: [],
      } as unknown as Partial<APIRadioGroupComponent>);
      return;
    }

    const cid = opts.customId ?? opts.custom_id;
    const options = opts.options;

    const payload = {
      type: ComponentType.RadioGroup,
      custom_id: cid,
      options: (options ?? []) as unknown as APIRadioGroupOption[],
      required: opts.required,
    } as unknown as Partial<APIRadioGroupComponent>;

    super(payload);

    if (cid !== undefined) {
      this.validateCustomId(cid);
    }

    if (options !== undefined) {
      this.validateArrayLength(options, MIN_OPTIONS, MAX_OPTIONS, 'options');
    }
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
   * Sets whether choice selection is required.
   * @param required Whether selection is required
   * @returns This builder instance
   */
  setRequired(required: boolean): this {
    this.data.required = required;
    return this;
  }

  /**
   * Replaces all radio options (must be between 2 and 10 options).
   * @param options Array of options to set
   * @returns This builder instance
   * @throws If options count is not between 2 and 10
   */
  setOptions(options: RadioGroupOptionBuilder[]): this {
    this.validateArrayLength(options, MIN_OPTIONS, MAX_OPTIONS, 'options');
    this.data.options = options as unknown as APIRadioGroupOption[];
    return this;
  }

  /**
   * Appends radio options (maximum of 10 in total).
   * @param options Options to add
   * @returns This builder instance
   * @throws If total options would exceed 10
   */
  addOptions(...options: RadioGroupOptionBuilder[]): this {
    if (!this.data.options) this.data.options = [];
    const cur = this.data.options.length;
    const add = options.length;
    if (cur + add > MAX_OPTIONS)
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `options size can't be more than ${MAX_OPTIONS}`);
    for (let i = 0; i < add; i++) {
      this.data.options.push(options[i] as unknown as APIRadioGroupOption);
    }
    return this;
  }

  /**
   * Splices radio options.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param options Options to insert
   * @returns This builder instance
   * @throws If result would not have between 2 and 10 options
   */
  spliceOptions(
    index: number,
    deleteCount: number,
    ...options: RadioGroupOptionBuilder[]
  ): this {
    if (!this.data.options) this.data.options = [];
    (this.data.options as unknown as RadioGroupOptionBuilder[]).splice(
      index,
      deleteCount,
      ...options,
    );
    this.validateArrayLength(this.data.options, MIN_OPTIONS, MAX_OPTIONS, 'options');
    return this;
  }

  /**
   * Converts this builder to a JSON payload.
   * @returns The JSON representation
   * @throws If options count is less than 2
   */
  override toJSON(): APIRadioGroupComponent {
    const data = this.data;
    if (data.custom_id === undefined) throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', 'customId is required');
    this.validateCustomId(data.custom_id);
    const len = data.options ? data.options.length : 0;
    if (len < MIN_OPTIONS || len > MAX_OPTIONS) {
      throw componentValidationError('RADIO_GROUP_VALIDATION_FAILED', `options needs between ${MIN_OPTIONS} and ${MAX_OPTIONS} elements, but got ${len}`);
    }

    const options = serializeEntries<APIRadioGroupOption>(data.options);
    for (let i = 0; i < options.length; i++) validateOptionFields(options[i]!);
    const payload: Record<string, unknown> = {
      type: ComponentType.RadioGroup,
      options,
    };

    if (data.custom_id !== undefined) payload.custom_id = data.custom_id;
    if (data.required !== undefined) payload.required = data.required;
    if (data.id !== undefined) payload.id = data.id;

    return payload as unknown as APIRadioGroupComponent;
  }
}

type ExtractRadioGroupOptions<Opts> =
  Opts extends { options: infer O }
  ? (O extends readonly RadioGroupOptionBuilder[] ? O : readonly RadioGroupOptionBuilder[])
  : readonly RadioGroupOptionBuilder[];

export const RadioGroupBuilder = RadioGroupBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Options extends readonly RadioGroupOptionBuilder[] = readonly RadioGroupOptionBuilder[],
    Opts extends RadioGroupOptions<CustomId, Options> = RadioGroupOptions<CustomId, Options>,
  >(
    opts?: Opts & ValidateRadioGroupOptions<Opts>,
  ): RadioGroupBuilderInstance<ExtractCustomId<Opts>, ExtractRadioGroupOptions<Opts>>;
  from(data: APIRadioGroupComponent): RadioGroupBuilder;
};

/**
 * Alias for RadioGroupBuilderClass.
 */
export type RadioGroupBuilder = RadioGroupBuilderClass;
