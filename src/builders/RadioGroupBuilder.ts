import { ComponentType } from '../enums.ts';
import type { APIRadioGroupComponent, APIRadioGroupOption } from '../types.ts';
import type { CheckArrayLength, CheckMaxLength, WithId } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface RadioGroupOptionOptions<
  Value extends string = string,
  Label extends string = string,
  Description extends string = string,
> {
  value: Value & CheckMaxLength<Value, 100, 'value'>;
  label: Label & CheckMaxLength<Label, 100, 'label'>;
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  default?: boolean;
}

export interface BaseRadioGroupOptions<
  Options extends readonly RadioGroupOptionBuilder[] = RadioGroupOptionBuilder[],
> {
  options: Options & CheckArrayLength<Options, 2, 10, 'options'>;
  required?: boolean;
}

export type RadioGroupOptions<
  CustomId extends string = string,
  Options extends readonly RadioGroupOptionBuilder[] = RadioGroupOptionBuilder[],
> = WithId<CustomId> & BaseRadioGroupOptions<Options>;

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
   * Creates a new RadioGroupOptionBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: RadioGroupOptionOptions<string, string, string>) {
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
    if (!this.data.value) throw new Error('value is required');
    if (!this.data.label) throw new Error('label is required');
    const res: APIRadioGroupOption = {
      value: this.data.value,
      label: this.data.label,
    };
    if (this.data.description !== undefined) res.description = this.data.description;
    if (this.data.default !== undefined) res.default = this.data.default;
    return res;
  }
}

export interface RadioGroupOptionBuilderInstance
  extends RadioGroupOptionBuilderClass {}

export const RadioGroupOptionBuilder =
  RadioGroupOptionBuilderClass as unknown as {
    new <
      Value extends string,
      Label extends string,
      Description extends string = string,
    >(
      opts: RadioGroupOptionOptions<Value, Label, Description>,
    ): RadioGroupOptionBuilderInstance;
    from(data: APIRadioGroupOption): RadioGroupOptionBuilder;
  };

export type RadioGroupOptionBuilder = RadioGroupOptionBuilderClass;

export interface RadioGroupBuilderInstance<
  CustomId extends string,
  Options extends readonly RadioGroupOptionBuilder[] = readonly RadioGroupOptionBuilder[],
> extends RadioGroupBuilderClass {
  readonly customId: CustomId;
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
 * @see {@link https://discord.com/developers/docs/components/reference#radio-button Discord Docs - Radio Button Group}
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
   * Creates a new RadioGroupBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: RadioGroupOptions<string, RadioGroupOptionBuilder[]>) {
    super();
    this.data.type = ComponentType.RadioGroup;
    this.data.options = [];

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');
    this.validateCustomId(cid);
    this.data.custom_id = cid;

    if (opts.options !== undefined)
      this.setOptions(opts.options as RadioGroupOptionBuilder[]);
    if (opts.required !== undefined) this.setRequired(opts.required);
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
    this.validateArrayLength(options, 2, 10, 'options');
    this.data.options = [...options] as unknown as APIRadioGroupOption[];
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
    if (this.data.options.length + options.length > 10)
      throw new Error("options size can't be more than 10");
    this.data.options.push(...(options as unknown as APIRadioGroupOption[]));
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
    this.validateArrayLength(this.data.options, 2, 10, 'options');
    return this;
  }

  /**
   * Converts this builder to a JSON payload.
   * @returns The JSON representation
   * @throws If options count is less than 2
   */
  override toJSON(): APIRadioGroupComponent {
    if (!this.data.options || this.data.options.length < 2)
      throw new Error('need at least 2 options to serialize (got ' + (this.data.options ? this.data.options.length : 0) + ')');
    // pre-allocated loop, avoids prototype lookup overhead of .map
    const rawOpts = this.data.options as unknown as readonly { toJSON(): APIRadioGroupOption }[];
    const len = rawOpts.length;
    const serializedOpts = new Array<APIRadioGroupOption>(len);
    for (let i = 0; i < len; i++) serializedOpts[i] = rawOpts[i]!.toJSON();
    const res: APIRadioGroupComponent = {
      type: ComponentType.RadioGroup,
      custom_id: this.data.custom_id ?? '',
      options: serializedOpts,
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.required !== undefined) res.required = this.data.required;
    return res;
  }
}

export const RadioGroupBuilder = RadioGroupBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    OptionType extends RadioGroupOptionBuilder = RadioGroupOptionBuilder,
    Options extends readonly OptionType[] = readonly OptionType[],
  >(
    opts: RadioGroupOptions<CustomId, Options>,
  ): RadioGroupBuilderInstance<CustomId, Options>;
  from(data: APIRadioGroupComponent): RadioGroupBuilder;
};

export type RadioGroupBuilder = RadioGroupBuilderClass;
