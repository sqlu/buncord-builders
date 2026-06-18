import { ComponentType } from '../enums.ts';
import type { APICheckboxGroupComponent, APICheckboxGroupOption } from '../types.ts';
import type { CheckArrayLength, CheckMaxLength, WithId } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface CheckboxGroupOptionOptions<
  Value extends string = string,
  Label extends string = string,
  Description extends string = string,
> {
  /**
   * The value returned when this option is selected (maximum of 100 characters).
   */
  value: Value & CheckMaxLength<Value, 100, 'value'>;
  /**
   * The label displayed for this option (maximum of 100 characters).
   */
  label: Label & CheckMaxLength<Label, 100, 'label'>;
  /**
   * An optional description displayed below the label (maximum of 100 characters).
   */
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  /**
   * Whether this option is checked by default.
   */
  default?: boolean;
}

export interface BaseCheckboxGroupOptions<
  Options extends readonly CheckboxGroupOptionBuilder[] = CheckboxGroupOptionBuilder[],
> {
  options: Options & CheckArrayLength<Options, 2, 10, 'options'>;
  minValues?: number;
  min_values?: number;
  maxValues?: number;
  max_values?: number;
  required?: boolean;
}

export type CheckboxGroupOptions<
  CustomId extends string = string,
  Options extends readonly CheckboxGroupOptionBuilder[] = CheckboxGroupOptionBuilder[],
> = WithId<CustomId> & BaseCheckboxGroupOptions<Options>;

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
   * Creates a new CheckboxGroupOptionBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: CheckboxGroupOptionOptions<string, string, string>) {
    if (opts.value !== undefined) this.setValue(opts.value as string);
    if (opts.label !== undefined) this.setLabel(opts.label as string);
    if (opts.description !== undefined)
      this.setDescription(opts.description as string);
    if (opts.default !== undefined) this.setDefault(opts.default);
  }

  /**
   * Sets the option value (maximum of 100 characters).
   * @param val The value to set
   * @returns This builder instance
   * @throws If value is empty or exceeds 100 characters
   */
  setValue(val: string): this {
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
  setLabel(lbl: string): this {
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
  setDescription(desc: string): this {
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
    const res: APICheckboxGroupOption = {
      value: this.data.value,
      label: this.data.label,
    };
    if (this.data.description !== undefined) res.description = this.data.description;
    if (this.data.default !== undefined) res.default = this.data.default;
    return res;
  }
}

export interface CheckboxGroupOptionBuilderInstance
  extends CheckboxGroupOptionBuilderClass {}

export const CheckboxGroupOptionBuilder =
  CheckboxGroupOptionBuilderClass as unknown as {
    new <
      Value extends string,
      Label extends string,
      Description extends string = string,
    >(
      opts: CheckboxGroupOptionOptions<Value, Label, Description>,
    ): CheckboxGroupOptionBuilderInstance;
    from(data: APICheckboxGroupOption): CheckboxGroupOptionBuilder;
  };

export type CheckboxGroupOptionBuilder = CheckboxGroupOptionBuilderClass;

export interface CheckboxGroupBuilderInstance<
  CustomId extends string,
  Options extends readonly CheckboxGroupOptionBuilder[] = readonly CheckboxGroupOptionBuilder[],
> extends CheckboxGroupBuilderClass {
  readonly customId: CustomId;
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
 *     new CheckboxGroupOptionBuilder({ value: 'coding', label: 'discordts-builders' }),
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
   * Creates a new CheckboxGroupBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: CheckboxGroupOptions<string, CheckboxGroupOptionBuilder[]>) {
    super();
    this.data.type = ComponentType.CheckboxGroup;
    this.data.options = [];

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');
    this.validateCustomId(cid);
    this.data.custom_id = cid;

    if (opts.options !== undefined)
      this.setOptions(opts.options as CheckboxGroupOptionBuilder[]);

    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;
    this.validateCheckboxGroupValues(min, max, opts.required);

    if (opts.required !== undefined) this.setRequired(opts.required);
    if (min !== undefined) this.setMinValues(min);
    if (max !== undefined) this.setMaxValues(max);
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
    this.data.options = [...options] as unknown as APICheckboxGroupOption[];
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
    if (this.data.options.length + options.length > 10)
      throw new Error("options size can't be more than 10");
    this.data.options.push(...(options as unknown as APICheckboxGroupOption[]));
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
    const rawOpts = this.data.options as unknown as readonly { toJSON(): APICheckboxGroupOption }[];
    const len = rawOpts ? rawOpts.length : 0;
    const serializedOpts = new Array<APICheckboxGroupOption>(len);
    for (let i = 0; i < len; i++) serializedOpts[i] = rawOpts[i]!.toJSON();
    const res: APICheckboxGroupComponent = {
      type: ComponentType.CheckboxGroup,
      custom_id: this.data.custom_id ?? '',
      options: serializedOpts,
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.min_values !== undefined) res.min_values = this.data.min_values;
    if (this.data.max_values !== undefined) res.max_values = this.data.max_values;
    if (this.data.required !== undefined) res.required = this.data.required;
    return res;
  }
}

export const CheckboxGroupBuilder = CheckboxGroupBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    OptionType extends CheckboxGroupOptionBuilder = CheckboxGroupOptionBuilder,
    Options extends readonly OptionType[] = readonly OptionType[],
  >(
    opts: CheckboxGroupOptions<CustomId, Options>,
  ): CheckboxGroupBuilderInstance<CustomId, Options>;
  from(data: APICheckboxGroupComponent): CheckboxGroupBuilder;
};

export type CheckboxGroupBuilder = CheckboxGroupBuilderClass;
