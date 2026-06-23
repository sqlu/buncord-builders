import { ComponentType } from '../enums.ts';
import type { APICheckboxGroupComponent, APICheckboxGroupOption } from '../types.ts';
import type {
  CheckArrayLength,
  CheckMaxLength,
  CheckMinLength,
  IsLessThanOrEqual,
  ExtractCustomId,
  GetCustomIdField,
  CheckStringConstraints,
  ValidateSelectMenuRequired,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';
/**
 * Config options for a new CheckboxGroupOptionBuilder.
 * @template Value The value string literal.
 * @template Label The label string literal.
 * @template Description The description string literal.
 */
export interface CheckboxGroupOptionOptions<
  Value extends string = string,
  Label extends string = string,
  Description extends string = string,
> {
  /**
   * The value returned when this option is selected (maximum of 100 characters).
   */
  value?: Value & CheckMinLength<Value, 1, 'value'> & CheckMaxLength<Value, 100, 'value'>;
  /**
   * The label displayed for this option (maximum of 100 characters).
   */
  label?: Label & CheckMaxLength<Label, 100, 'label'>;
  /**
   * An optional description displayed below the label (maximum of 100 characters).
   */
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  /**
   * Whether this option is checked by default.
   */
  default?: boolean;
}

/**
 * Config options for a new CheckboxGroupBuilder.
 * @template CustomId The custom ID string literal.
 * @template Options The checkbox option builders array.
 * @template MinValues The minimum selected options.
 * @template MaxValues The maximum selected options.
 */
export interface CheckboxGroupOptions<
  CustomId extends string = string,
  Options extends readonly CheckboxGroupOptionBuilder[] = readonly CheckboxGroupOptionBuilder[],
  MinValues extends number = number,
  MaxValues extends number = number,
> {
  /** The list of checkbox options (2-10 options allowed). */
  options?: readonly [...Options];
  /** The minimum number of checked options required (0-10). */
  minValues?: MinValues;
  /** Alias for minValues. */
  min_values?: MinValues;
  /** The maximum number of checked options allowed (1-10). */
  maxValues?: MaxValues;
  /** Alias for maxValues. */
  max_values?: MaxValues;
  /** Whether at least minValues must be selected (defaults to true). */
  required?: boolean;
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: CustomId;
  /** Alias for customId. */
  custom_id?: CustomId;
}

type GetOptions<Opts> = Opts extends { options: infer O } ? (O extends readonly unknown[] ? O : never) : never;

/**
 * Type-level validation for CheckboxGroupOptions.
 * @template Opts The user configuration options object.
 */
export type ValidateCheckboxGroupOptions<Opts> =
  CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : Opts extends { options: unknown }
  ? ([GetOptions<Opts>] extends [never]
      ? { readonly error: 'options must be a valid array' }
      : CheckArrayLength<GetOptions<Opts>, 2, 10, 'options'> extends { readonly error: string }
      ? CheckArrayLength<GetOptions<Opts>, 2, 10, 'options'>
      : Opts extends { minValues: number; maxValues: number }
      ? (IsLessThanOrEqual<Opts['minValues'], Opts['maxValues']> extends true
          ? unknown
          : { readonly error: 'minValues cannot be greater than maxValues' })
      : Opts extends { min_values: number; max_values: number }
      ? (IsLessThanOrEqual<Opts['min_values'], Opts['max_values']> extends true
          ? unknown
          : { readonly error: 'minValues cannot be greater than maxValues' })
      : unknown)
  : Opts extends { minValues: number; maxValues: number }
  ? (IsLessThanOrEqual<Opts['minValues'], Opts['maxValues']> extends true
      ? unknown
      : { readonly error: 'minValues cannot be greater than maxValues' })
  : Opts extends { min_values: number; max_values: number }
  ? (IsLessThanOrEqual<Opts['min_values'], Opts['max_values']> extends true
      ? unknown
      : { readonly error: 'minValues cannot be greater than maxValues' })
  : unknown;



/**
 * Represents an option within a Checkbox Group component.
 */
class CheckboxGroupOptionBuilderClass {
  public data: Partial<APICheckboxGroupOption> = {};

  /**
   * Recreates a CheckboxGroupOptionBuilder from a raw API payload.
   * @param data Raw checkbox group option data payload
   * @returns A new CheckboxGroupOptionBuilderClass instance
   */
  public static from(data: APICheckboxGroupOption): CheckboxGroupOptionBuilderClass {
    const raw = resolveRaw(data) as unknown as APICheckboxGroupOption;
    const builder = new CheckboxGroupOptionBuilderClass({
      value: raw.value,
      label: raw.label,
    });
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
   * Gets whether the option is checked by default.
   * @readonly
   */
  public get default(): boolean | undefined {
    return this.data.default;
  }

  /**
   * Creates a new CheckboxGroupOptionBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: CheckboxGroupOptionOptions<string, string, string>) {
    if (!opts) return;
    const val = opts.value as string | undefined;
    if (val !== undefined) {
      if (val.length < 1) throw new Error('value needs to be at least 1 character');
      if (val.length > 100) throw new Error(`value is too long, max is 100 characters but got ${val.length}`);
      this.data.value = val;
    }
    const lbl = opts.label as string | undefined;
    if (lbl !== undefined) {
      if (lbl.length > 100) throw new Error(`label is too long, max is 100 characters but got ${lbl.length}`);
      this.data.label = lbl;
    }
    if (opts.description !== undefined) {
      const d = opts.description as string;
      if (d.length > 100) throw new Error(`description is too long, max is 100 characters but got ${d.length}`);
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
      throw new Error('value needs to be at least 1 character');
    }
    if (val.length > 100) {
      throw new Error(`value is too long, max is 100 characters but got ${val.length}`);
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
      throw new Error(`label is too long, max is 100 characters but got ${lbl.length}`);
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
      throw new Error(`description is too long, max is 100 characters but got ${desc.length}`);
    }
    this.data.description = desc;
    return this;
  }

  /**
   * Sets whether the option is checked by default.
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
  toJSON(): APICheckboxGroupOption {
    if (!this.data.value) throw new Error('value is required');
    if (!this.data.label) throw new Error('label is required');
    return this.data as APICheckboxGroupOption;
  }
}

/**
 * Interface for a configured CheckboxGroupOptionBuilder.
 */
export interface CheckboxGroupOptionBuilderInstance
  extends CheckboxGroupOptionBuilderClass {}

export const CheckboxGroupOptionBuilder =
  CheckboxGroupOptionBuilderClass as unknown as {
    new <
      Value extends string = string,
      Label extends string = string,
      Description extends string = string,
    >(
      opts?: CheckboxGroupOptionOptions<Value, Label, Description>,
    ): CheckboxGroupOptionBuilderInstance;
    from(data: APICheckboxGroupOption): CheckboxGroupOptionBuilder;
  };

export type CheckboxGroupOptionBuilder = CheckboxGroupOptionBuilderClass;

/**
 * Interface for a fully configured CheckboxGroupBuilder.
 * @template CustomId The custom ID of the checkbox group.
 * @template Options The options contained in the checkbox group.
 */
export interface CheckboxGroupBuilderInstance<
  CustomId extends string,
  Options extends readonly CheckboxGroupOptionBuilder[] = readonly CheckboxGroupOptionBuilder[],
> extends CheckboxGroupBuilderClass {
  /** The configured custom identifier of the group. */
  readonly customId: CustomId;
  /** The checkbox options configured in the group. */
  readonly options: Options;
}

/**
 * Builds a Checkbox Group component (type 22) for use inside modal forms.
 * Lets users select **multiple** options from a predefined list (2-10 options required).
 *
 * Set `minValues`/`maxValues` to control how many choices are valid.
 * `minValues: 0` is only allowed when `required` is `false`.
 *
 * **Modal-only** - wrap in a {@link LabelBuilder} to show a label.
 *
 * @example
 * ```ts
 * const checkboxGroup = new CheckboxGroupBuilder({
 *   customId: 'interests',
 *   options: [
 *     new CheckboxGroupOptionBuilder({ value: 'coding', label: '@buncord/builders' }),
 *     new CheckboxGroupOptionBuilder({ value: 'coding', label: 'ISAE Supaero' }),
 *   ],
 *   minValues: 1,
 *   maxValues: 2,
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#checkbox-group Discord Docs - Checkbox Group}
 */
class CheckboxGroupBuilderClass extends BaseComponent<Partial<APICheckboxGroupComponent>> {
  public override readonly type = ComponentType.CheckboxGroup;

  /**
   * Recreates a CheckboxGroupBuilder from a raw API payload.
   * @param data Raw checkbox group data payload
   * @returns A new CheckboxGroupBuilderClass instance
   * @throws If payload is missing required fields
   */
  public static from(data: APICheckboxGroupComponent): CheckboxGroupBuilderClass {
    const raw = resolveRaw(data) as unknown as APICheckboxGroupComponent;
    const opts = (raw.options ?? []).map((o) => CheckboxGroupOptionBuilder.from(o));
    const builder = new CheckboxGroupBuilderClass({
      customId: raw.custom_id,
      options: opts,
    });
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the custom identifier of the group.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Gets the minimum number of selected values.
   * @readonly
   */
  public get minValues(): number | undefined {
    return this.data.min_values;
  }

  /**
   * Gets the maximum number of selected values.
   * @readonly
   */
  public get maxValues(): number | undefined {
    return this.data.max_values;
  }

  /**
   * Gets whether selection is required.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }

  /**
   * Gets the checkbox options.
   * @readonly
   */
  public get options(): readonly CheckboxGroupOptionBuilder[] {
    return (this.data.options ?? []) as unknown as readonly CheckboxGroupOptionBuilder[];
  }

  private validateCheckboxGroupValues(
    min: number | undefined,
    max: number | undefined,
    required: boolean | undefined = this.data.required,
  ): void {
    if (min !== undefined) this.validateRange(min, 0, 10, 'minValues');
    if (max !== undefined) this.validateRange(max, 1, 10, 'maxValues');
    if (min !== undefined && max !== undefined && min > max) {
      throw new Error(`minValues can't be more than maxValues (you set minValues to ${min} and maxValues to ${max})`);
    }
    if (min === 0 && required !== false) {
      throw new Error('minValues can only be 0 if required is false');
    }
  }

  /**
   * Creates a new CheckboxGroupBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: CheckboxGroupOptions<string, CheckboxGroupOptionBuilder[]>) {
    if (!opts) {
      super({
        type: ComponentType.CheckboxGroup,
        options: [],
      } as unknown as Partial<APICheckboxGroupComponent>);
      return;
    }

    const cid = opts.customId ?? opts.custom_id;
    const options = opts.options;
    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;

    const payload = {
      type: ComponentType.CheckboxGroup,
      custom_id: cid,
      options: (options ?? []) as unknown as APICheckboxGroupOption[],
      min_values: min,
      max_values: max,
      required: opts.required,
    } as unknown as Partial<APICheckboxGroupComponent>;

    super(payload);

    if (cid !== undefined) {
      this.validateCustomId(cid);
    }

    if (options !== undefined) {
      this.validateArrayLength(options, 2, 10, 'options');
    }

    this.validateCheckboxGroupValues(min, max, opts.required);
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
   * Sets the minimum number of selected values (0 to 10).
   * @param min The minimum value to set
   * @returns This builder instance
   * @throws If minValues is invalid or exceeds maxValues
   */
  setMinValues(min: number): this {
    this.validateCheckboxGroupValues(min, this.data.max_values);
    this.data.min_values = min;
    return this;
  }

  /**
   * Sets the maximum number of selected values (1 to 10).
   * @param max The maximum value to set
   * @returns This builder instance
   * @throws If maxValues is invalid or less than minValues
   */
  setMaxValues(max: number): this {
    this.validateCheckboxGroupValues(this.data.min_values, max);
    this.data.max_values = max;
    return this;
  }

  /**
   * Sets whether selection is required.
   * @param required Whether selection is required
   * @returns This builder instance
   * @throws If required conflicts with minValues
   */
  setRequired(required: boolean): this {
    this.validateCheckboxGroupValues(this.data.min_values, this.data.max_values, required);
    this.data.required = required;
    return this;
  }

  /**
   * Replaces all checkbox options (must be between 2 and 10 options).
   * @param options Array of options to set
   * @returns This builder instance
   * @throws If options count is not between 2 and 10
   */
  setOptions(options: CheckboxGroupOptionBuilder[]): this {
    this.validateArrayLength(options, 2, 10, 'options');
    this.data.options = options as unknown as APICheckboxGroupOption[];
    return this;
  }

  /**
   * Appends checkbox options (maximum of 10 in total).
   * @param options Options to add
   * @returns This builder instance
   * @throws If total options would exceed 10
   */
  addOptions(...options: CheckboxGroupOptionBuilder[]): this {
    if (!this.data.options) this.data.options = [];
    const cur = this.data.options.length;
    const add = options.length;
    if (cur + add > 10)
      throw new Error("options size can't be more than 10");
    for (let i = 0; i < add; i++) {
      this.data.options.push(options[i] as unknown as APICheckboxGroupOption);
    }
    return this;
  }

  /**
   * Splices checkbox options.
   * @param index Starting index for splice
   * @param deleteCount Number of elements to delete
   * @param options Options to insert
   * @returns This builder instance
   * @throws If result would not have between 2 and 10 options
   */
  spliceOptions(
    index: number,
    deleteCount: number,
    ...options: CheckboxGroupOptionBuilder[]
  ): this {
    if (!this.data.options) this.data.options = [];
    (this.data.options as unknown as CheckboxGroupOptionBuilder[]).splice(
      index,
      deleteCount,
      ...options,
    );
    this.validateArrayLength(this.data.options, 2, 10, 'options');
    return this;
  }

  /**
   * Converts this builder to a JSON payload.
   * @returns The JSON representation
   */
  override toJSON(): APICheckboxGroupComponent {
    const rawOpts = this.data.options;
    const len = rawOpts ? rawOpts.length : 0;
    let serializedOpts = rawOpts as unknown as APICheckboxGroupOption[];
    if (rawOpts) {
      let hasBuilder = false;
      for (let i = 0; i < len; i++) {
        const o = rawOpts[i];
        if (o && typeof (o as unknown as Record<string, unknown>).toJSON === 'function') {
          hasBuilder = true;
          break;
        }
      }
      if (hasBuilder) {
        serializedOpts = new Array<APICheckboxGroupOption>(len);
        for (let i = 0; i < len; i++) {
          const o = rawOpts[i]!;
          serializedOpts[i] = typeof (o as unknown as Record<string, unknown>).toJSON === 'function'
            ? (o as unknown as { toJSON(): APICheckboxGroupOption }).toJSON()
            : (o as APICheckboxGroupOption);
        }
      }
    }
    const data = this.data;
    return {
      type: ComponentType.CheckboxGroup,
      custom_id: data.custom_id,
      options: serializedOpts,
      min_values: data.min_values,
      max_values: data.max_values,
      required: data.required,
      id: this.id !== undefined ? this.id : data.id,
    } as unknown as APICheckboxGroupComponent;
  }
}

type ExtractCheckboxGroupOptions<Opts> =
  Opts extends { options: infer O }
  ? (O extends readonly CheckboxGroupOptionBuilder[] ? O : readonly CheckboxGroupOptionBuilder[])
  : readonly CheckboxGroupOptionBuilder[];

export const CheckboxGroupBuilder = CheckboxGroupBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Options extends readonly CheckboxGroupOptionBuilder[] = readonly CheckboxGroupOptionBuilder[],
    MinValues extends number = number,
    MaxValues extends number = number,
    Opts extends CheckboxGroupOptions<CustomId, Options, MinValues, MaxValues> = CheckboxGroupOptions<CustomId, Options, MinValues, MaxValues>,
  >(
    opts?: Opts & ValidateCheckboxGroupOptions<Opts> & ValidateSelectMenuRequired<Opts>,
  ): CheckboxGroupBuilderInstance<ExtractCustomId<Opts>, ExtractCheckboxGroupOptions<Opts>>;
  from(data: APICheckboxGroupComponent): CheckboxGroupBuilder;
};

/**
 * Alias for CheckboxGroupBuilderClass.
 */
export type CheckboxGroupBuilder = CheckboxGroupBuilderClass;
