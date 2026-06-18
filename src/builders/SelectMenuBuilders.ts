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
  WithId,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

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
    if (min !== undefined) this.validateRange(min, 0, 25, 'minValues');
    if (max !== undefined) this.validateRange(max, 1, 25, 'maxValues');
    if (min !== undefined && max !== undefined && min > max) {
      throw new Error(`minValues can't be more than maxValues (you set minValues to ${min} and maxValues to ${max})`);
    }
    if (min === 0 && required !== false) {
      throw new Error('minValues can only be 0 if required is false');
    }
  }

  protected validateDefaultValues(
    vals: readonly { id: string; type: string }[] | undefined,
    allowed: string[],
    min: number | undefined,
    max: number | undefined,
  ): void {
    if (!vals || vals.length === 0) return;
    if (vals.length > 25) throw new Error("can't have more than 25 default values");
    const count = vals.length;
    if (min !== undefined && count < min) {
      throw new Error(`default_values count (${count}) is less than minValues (${min})`);
    }
    if (max !== undefined && count > max) {
      throw new Error(`default_values count (${count}) exceeds maxValues (${max})`);
    }
    for (const v of vals) {
      const isStd = ([
        SelectMenuDefaultValueType.User,
        SelectMenuDefaultValueType.Role,
        SelectMenuDefaultValueType.Channel,
      ] as string[]).includes(v.type);
      if (isStd && !allowed.includes(v.type))
        throw new Error(`default type "${v.type}" is invalid, must be one of: ${allowed.join(', ')}`);
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
    if (placeholder !== undefined) this.validateLength(placeholder, 150, 'placeholder');

    (this.data as Record<string, unknown>).custom_id = cid;
    if (placeholder !== undefined) (this.data as Record<string, unknown>).placeholder = placeholder;
    if (min !== undefined) (this.data as Record<string, unknown>).min_values = min;
    if (max !== undefined) (this.data as Record<string, unknown>).max_values = max;
    if (required !== undefined) (this.data as Record<string, unknown>).required = required;
    if (disabled !== undefined) (this.data as Record<string, unknown>).disabled = disabled;
  }

      /**
   * Sets the custom identifier for this component (maximum of 100 characters).
   * @param cid - The unique custom identifier.
   * @returns This builder instance for chaining.
   */
  setCustomId(cid: string): this {
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
  setPlaceholder(placeholder: string): this {
    this.validateLength(placeholder, 150, 'placeholder');
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

export interface TypeSafeSelectMenuOption<
  Label extends string = string,
  Value extends string = string,
  Description extends string = string,
> {
  label: Label & CheckMaxLength<Label, 100, 'label'>;
  value: Value & CheckMaxLength<Value, 100, 'value'>;
  description?: Description & CheckMaxLength<Description, 100, 'description'>;
  emoji?: APIMessageComponentEmoji;
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
   * Creates a new StringSelectMenuOptionBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts?: TypeSafeSelectMenuOption<string, string, string>) {
    if (!opts) return;
    if (opts.label !== undefined) this.setLabel(opts.label as string);
    if (opts.value !== undefined) this.setValue(opts.value as string);
    if (opts.description !== undefined)
      this.setDescription(opts.description as string);
    if (opts.emoji !== undefined) this.setEmoji(opts.emoji);
    if (opts.default !== undefined) this.setDefault(opts.default);
  }

  /**
   * Sets the label text displayed for this option (maximum of 100 characters).
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
   * Sets the description text for this option (maximum of 100 characters).
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
    if (!this.data.label) throw new Error('label is required');
    if (!this.data.value) throw new Error('value is required');
    const res: APISelectMenuOption = {
      label: this.data.label,
      value: this.data.value,
    };
    if (this.data.description !== undefined) res.description = this.data.description;
    if (this.data.emoji !== undefined) res.emoji = this.data.emoji;
    if (this.data.default !== undefined) res.default = this.data.default;
    return res;
  }
}

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
export type StringSelectMenuOptionBuilder =
  StringSelectMenuOptionBuilderClass;

export interface BaseStringSelectMenuOptions<
  Placeholder extends string = string,
  Options extends readonly (
    | TypeSafeSelectMenuOption
    | StringSelectMenuOptionBuilder
  )[] = (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
> {
  options: Options & CheckArrayLength<Options, 1, 25, 'options'>;
  placeholder?: Placeholder & CheckMaxLength<Placeholder, 150, 'Placeholder'>;
  minValues?: number;
  min_values?: number;
  maxValues?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
}

export type StringSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
  Options extends readonly (
    | TypeSafeSelectMenuOption
    | StringSelectMenuOptionBuilder
  )[] = (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
> = WithId<CustomId> & BaseStringSelectMenuOptions<Placeholder, Options>;

export interface StringSelectMenuBuilderInstance<
  CustomId extends string,
  Options extends readonly (
    | TypeSafeSelectMenuOption
    | StringSelectMenuOptionBuilder
  )[] = readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[],
> extends StringSelectMenuBuilderClass {
  readonly customId: CustomId;
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
 *     new StringSelectMenuOptionBuilder({ label: 'discordts-builders', value: 'builders' }),
 *     new StringSelectMenuOptionBuilder({ label: 'Others Project', value: 'other' }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#string-select Discord Docs - String Select}
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
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.options) {
      builder.setOptions((raw.options ?? []).map((o) => StringSelectMenuOptionBuilder.from(o)));
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

      /**
   * Creates a new StringSelectMenuBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(
    opts: StringSelectMenuOptions<
      string,
      string,
      (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]
    >,
  ) {
    super();
    this.data.type = ComponentType.StringSelect;
    this.data.options = [];

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');

    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;

    this.initCommon(cid, opts.placeholder as string | undefined, min, max, opts.disabled, opts.required);
    if (opts.options !== undefined) this.setOptions(opts.options as (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[]);
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
    this.data.options = [...options] as unknown as APISelectMenuOption[];
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
    if (this.data.options.length + options.length > 25)
      throw new Error("options size can't be more than 25");
    this.data.options.push(...(options as unknown as APISelectMenuOption[]));
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
   * Serializes the StringSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIStringSelectComponent {
    // manual loop, faster than .map for options
    const rawOpts = this.data.options as unknown as readonly (TypeSafeSelectMenuOption | StringSelectMenuOptionBuilder)[];
    const len = rawOpts ? rawOpts.length : 0;
    const serializedOpts = new Array<APISelectMenuOption>(len);
    for (let i = 0; i < len; i++) {
      const o = rawOpts[i];
      // builder or raw object
      serializedOpts[i] = typeof (o as { toJSON?: unknown }).toJSON === 'function'
        ? (o as { toJSON(): APISelectMenuOption }).toJSON()
        : o as unknown as APISelectMenuOption;
    }
    const res: APIStringSelectComponent = {
      type: ComponentType.StringSelect,
      custom_id: this.data.custom_id ?? '',
      options: serializedOpts,
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.placeholder !== undefined) res.placeholder = this.data.placeholder;
    if (this.data.min_values !== undefined) res.min_values = this.data.min_values;
    if (this.data.max_values !== undefined) res.max_values = this.data.max_values;
    if (this.data.disabled !== undefined) res.disabled = this.data.disabled;
    if (this.data.required !== undefined) res.required = this.data.required;
    return res;
  }
}

export const StringSelectMenuBuilder =
  StringSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
      OptionType extends
        | TypeSafeSelectMenuOption
        | StringSelectMenuOptionBuilder =
        | TypeSafeSelectMenuOption
        | StringSelectMenuOptionBuilder,
      Options extends readonly OptionType[] = readonly OptionType[],
    >(
      opts: StringSelectMenuOptions<CustomId, Placeholder, Options>,
    ): StringSelectMenuBuilderInstance<CustomId, Options>;
    from(data: APIStringSelectComponent): StringSelectMenuBuilder;
  };
export type StringSelectMenuBuilder = StringSelectMenuBuilderClass;

export interface BaseAutoSelectMenuOptions<
  Placeholder extends string = string,
> {
  placeholder?: Placeholder & CheckMaxLength<Placeholder, 150, 'Placeholder'>;
  minValues?: number;
  min_values?: number;
  maxValues?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Common base class for auto-populated select menus (User, Role, Mentionable, Channel).
 */
abstract class BaseAutoSelectMenuBuilderClass<
  TData extends Partial<APIBaseSelectMenuComponent> = Partial<APIBaseSelectMenuComponent>,
> extends BaseSelectMenuBuilderClass<TData> {
  protected abstract get allowedDefaultTypes(): string[];

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
    if (!cid) throw new Error('customId is required');
    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;
    this.initCommon(cid, opts.placeholder as string | undefined, min, max, opts.disabled, opts.required);
  }

      /**
   * Sets the minimum number of selected choices required (between 0 and 25).
   * Overrides to revalidate default values.
   * @param min - The minimum values count to set.
   * @returns This builder instance for chaining.
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
   * @returns This builder instance for chaining.
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

  protected addDefaultValuesRaw(
    entries: APISelectMenuDefaultValue[],
  ): void {
    if (!(this.data as Record<string, unknown>).default_values) (this.data as Record<string, unknown>).default_values = [];
    const newDefaults = [
      ...((this.data as Record<string, unknown>).default_values as APISelectMenuDefaultValue[]),
      ...entries,
    ];
    this.validateDefaultValues(
      newDefaults,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    (this.data as Record<string, unknown>).default_values = newDefaults;
  }

  protected buildJSON(type: number): Record<string, unknown> {
    const res: Record<string, unknown> = {
      type,
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.custom_id !== undefined) res.custom_id = this.data.custom_id;
    if (this.data.placeholder !== undefined) res.placeholder = this.data.placeholder;
    if (this.data.min_values !== undefined) res.min_values = this.data.min_values;
    if (this.data.max_values !== undefined) res.max_values = this.data.max_values;
    if (this.data.disabled !== undefined) res.disabled = this.data.disabled;
    if (this.data.required !== undefined) res.required = this.data.required;

    // avoid sending default_values if empty, Discord dislikes empty arrays
    const defs = (this.data as Record<string, unknown>).default_values;
    if (Array.isArray(defs) && defs.length > 0) {
      res.default_values = defs as APISelectMenuDefaultValue[];
    }

    const chanTypes = (this.data as Record<string, unknown>).channel_types;
    if (Array.isArray(chanTypes) && chanTypes.length > 0) {
      res.channel_types = chanTypes as ChannelType[];
    }

    return res;
  }
}

export type UserSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
> = WithId<CustomId> & BaseAutoSelectMenuOptions<Placeholder>;

export interface UserSelectMenuBuilderInstance<CustomId extends string>
  extends UserSelectMenuBuilderClass {
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

  protected get allowedDefaultTypes(): string[] {
    return [SelectMenuDefaultValueType.User];
  }

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
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultUsers(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

      /**
   * Creates a new UserSelectMenuBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: UserSelectMenuOptions<string, string>) {
    super();
    this.data.type = ComponentType.UserSelect;
    this.data.default_values = [];
    this.initAuto(opts);
  }

        /**
   * Sets the default pre-selected users for this select menu (up to 25 entries).
   * @param users - User IDs or pre-selected user value objects.
   * @returns This builder instance for chaining.
   */
setDefaultUsers(users: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = users.map((u) => ({
      id: typeof u === 'string' ? u : u.id,
      type: (typeof u === 'object' && u.type) ? u.type : SelectMenuDefaultValueType.User,
    })) as APISelectMenuDefaultValue[];
    this.validateDefaultValues(
      vals,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    this.data.default_values = vals;
    return this;
  }

  /**
   * Sets default pre-selected users (maximum of 25 values).
   * @param users Users to set as default
   * @returns This builder instance
   * @throws If default values count exceeds 25 or violates min/max constraints
   */
  addDefaultUsers(...users: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.addDefaultValuesRaw(
      users.map((u) => ({
        id: typeof u === 'string' ? u : u.id,
        type: (typeof u === 'object' && u.type) ? u.type : SelectMenuDefaultValueType.User,
      })) as APISelectMenuDefaultValue[],
    );
    return this;
  }

      /**
   * Serializes the UserSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIUserSelectComponent {
    return this.buildJSON(ComponentType.UserSelect) as unknown as APIUserSelectComponent;
  }
}

export const UserSelectMenuBuilder = UserSelectMenuBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Placeholder extends string = string,
  >(
    opts: UserSelectMenuOptions<CustomId, Placeholder>,
  ): UserSelectMenuBuilderInstance<CustomId>;
  from(data: APIUserSelectComponent): UserSelectMenuBuilder;
};
export type UserSelectMenuBuilder = UserSelectMenuBuilderClass;

export type RoleSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
> = WithId<CustomId> & BaseAutoSelectMenuOptions<Placeholder>;

export interface RoleSelectMenuBuilderInstance<CustomId extends string>
  extends RoleSelectMenuBuilderClass {
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
 *   placeholder: 'Select a project role in discordts-builders...',
 * });
 * ```
 */
class RoleSelectMenuBuilderClass extends BaseAutoSelectMenuBuilderClass<Partial<APIRoleSelectComponent>> {
  public override readonly type = ComponentType.RoleSelect;

  protected get allowedDefaultTypes(): string[] {
    return [SelectMenuDefaultValueType.Role];
  }

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
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultRoles(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

      /**
   * Creates a new RoleSelectMenuBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: RoleSelectMenuOptions<string, string>) {
    super();
    this.data.type = ComponentType.RoleSelect;
    this.data.default_values = [];
    this.initAuto(opts);
  }

        /**
   * Sets the default pre-selected roles for this select menu (up to 25 entries).
   * @param roles - Role IDs or pre-selected role value objects.
   * @returns This builder instance for chaining.
   */
setDefaultRoles(roles: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = roles.map((r) => ({
      id: typeof r === 'string' ? r : r.id,
      type: (typeof r === 'object' && r.type) ? r.type : SelectMenuDefaultValueType.Role,
    })) as APISelectMenuDefaultValue[];
    this.validateDefaultValues(
      vals,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    this.data.default_values = vals;
    return this;
  }

      /**
   * Appends roles to the list of default pre-selected roles.
   * @param roles - Role IDs or pre-selected role value objects to add.
   * @returns This builder instance for chaining.
   */
  addDefaultRoles(...roles: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.addDefaultValuesRaw(
      roles.map((r) => ({
        id: typeof r === 'string' ? r : r.id,
        type: (typeof r === 'object' && r.type) ? r.type : SelectMenuDefaultValueType.Role,
      })) as APISelectMenuDefaultValue[],
    );
    return this;
  }

      /**
   * Serializes the RoleSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIRoleSelectComponent {
    return this.buildJSON(ComponentType.RoleSelect) as unknown as APIRoleSelectComponent;
  }
}

export const RoleSelectMenuBuilder = RoleSelectMenuBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Placeholder extends string = string,
  >(
    opts: RoleSelectMenuOptions<CustomId, Placeholder>,
  ): RoleSelectMenuBuilderInstance<CustomId>;
  from(data: APIRoleSelectComponent): RoleSelectMenuBuilder;
};
export type RoleSelectMenuBuilder = RoleSelectMenuBuilderClass;

export type MentionableSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
> = WithId<CustomId> & BaseAutoSelectMenuOptions<Placeholder>;

export interface MentionableSelectMenuBuilderInstance<CustomId extends string>
  extends MentionableSelectMenuBuilderClass {
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

  protected get allowedDefaultTypes(): string[] {
    return [SelectMenuDefaultValueType.User, SelectMenuDefaultValueType.Role];
  }

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
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.disabled !== undefined) builder.setDisabled(raw.disabled);
    if (raw.default_values) builder.setDefaultValues(raw.default_values);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

      /**
   * Creates a new MentionableSelectMenuBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: MentionableSelectMenuOptions<string, string>) {
    super();
    this.data.type = ComponentType.MentionableSelect;
    this.data.default_values = [];
    this.initAuto(opts);
  }

  /**
   * Sets default pre-selected users and roles (maximum of 25 values).
   * @param values Default values to set
   * @returns This builder instance
   * @throws If default values count exceeds 25 or violates min/max constraints
   */
  setDefaultValues(values: APISelectMenuDefaultValue[]): this {
    const vals = values.map((v) => ({
      id: v.id,
      type: v.type,
    }));
    this.validateDefaultValues(
      vals,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    this.data.default_values = vals;
    return this;
  }

  /**
   * Appends pre-selected mentionable items.
   * @param values Values to add
   * @returns This builder instance
   * @throws If default values count would exceed 25
   */
  addDefaultValues(...values: APISelectMenuDefaultValue[]): this {
    this.addDefaultValuesRaw(values);
    return this;
  }

      /**
   * Appends users to the list of default pre-selected mentionables.
   * @param users - User IDs or pre-selected user value objects to add.
   * @returns This builder instance for chaining.
   */
  addDefaultUsers(...users: (string | { id: string })[]): this {
    this.addDefaultValuesRaw(
      users.map((u) => ({
        id: typeof u === 'string' ? u : u.id,
        type: 'user' as const,
      })),
    );
    return this;
  }

      /**
   * Appends roles to the list of default pre-selected roles.
   * @param roles - Role IDs or pre-selected role value objects to add.
   * @returns This builder instance for chaining.
   */
  addDefaultRoles(...roles: (string | { id: string })[]): this {
    this.addDefaultValuesRaw(
      roles.map((r) => ({
        id: typeof r === 'string' ? r : r.id,
        type: 'role' as const,
      })),
    );
    return this;
  }

      /**
   * Serializes the MentionableSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIMentionableSelectComponent {
    return this.buildJSON(ComponentType.MentionableSelect) as unknown as APIMentionableSelectComponent;
  }
}

export const MentionableSelectMenuBuilder =
  MentionableSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
    >(
      opts: MentionableSelectMenuOptions<CustomId, Placeholder>,
    ): MentionableSelectMenuBuilderInstance<CustomId>;
    from(data: APIMentionableSelectComponent): MentionableSelectMenuBuilder;
  };
export type MentionableSelectMenuBuilder = MentionableSelectMenuBuilderClass;

export interface BaseChannelSelectMenuOptions<
  Placeholder extends string = string,
> extends BaseAutoSelectMenuOptions<Placeholder> {
  channelTypes?: ChannelType[];
  channel_types?: ChannelType[];
}

export type ChannelSelectMenuOptions<
  CustomId extends string = string,
  Placeholder extends string = string,
> = WithId<CustomId> & BaseChannelSelectMenuOptions<Placeholder>;

export interface ChannelSelectMenuBuilderInstance<CustomId extends string>
  extends ChannelSelectMenuBuilderClass {
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

  protected get allowedDefaultTypes(): string[] {
    return [SelectMenuDefaultValueType.Channel];
  }

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
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values);
    if (raw.required !== undefined) builder.setRequired(raw.required);
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

      /**
   * Creates a new ChannelSelectMenuBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: ChannelSelectMenuOptions<string, string>) {
    super();
    this.data.type = ComponentType.ChannelSelect;
    this.data.default_values = [];
    this.initAuto(opts);

    const types = opts.channelTypes ?? opts.channel_types;
    if (types !== undefined) this.setChannelTypes(types);
  }

  /**
   * Limits selectable channels to specific channel types.
   * @param channelTypes Array of channel types to allow
   * @returns This builder instance
   */
  setChannelTypes(channelTypes: ChannelType[]): this {
    this.data.channel_types = channelTypes;
    return this;
  }

      /**
   * Adds allowed channel types to filter the channel list.
   * @param channelTypes - The channel types to allow.
   * @returns This builder instance for chaining.
   */
  addChannelTypes(...channelTypes: ChannelType[]): this {
    if (!Array.isArray(this.data.channel_types))
      this.data.channel_types = [];
    this.data.channel_types.push(...channelTypes);
    return this;
  }

        /**
   * Sets the default pre-selected channels for this select menu (up to 25 entries).
   * @param channels - Channel IDs or pre-selected channel value objects.
   * @returns This builder instance for chaining.
   */
setDefaultChannels(channels: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    const vals = channels.map((c) => ({
      id: typeof c === 'string' ? c : c.id,
      type: (typeof c === 'object' && c.type) ? c.type : SelectMenuDefaultValueType.Channel,
    })) as APISelectMenuDefaultValue[];
    this.validateDefaultValues(
      vals,
      this.allowedDefaultTypes,
      this.data.min_values,
      this.data.max_values,
    );
    this.data.default_values = vals;
    return this;
  }

      /**
   * Appends channels to the list of default pre-selected channels.
   * @param channels - Channel IDs or pre-selected channel value objects to add.
   * @returns This builder instance for chaining.
   */
  addDefaultChannels(...channels: (string | { id: string; type?: SelectMenuDefaultValueType | (string & {}) })[]): this {
    this.addDefaultValuesRaw(
      channels.map((c) => ({
        id: typeof c === 'string' ? c : c.id,
        type: (typeof c === 'object' && c.type) ? c.type : SelectMenuDefaultValueType.Channel,
      })) as APISelectMenuDefaultValue[],
    );
    return this;
  }

      /**
   * Serializes the ChannelSelectMenuBuilder builder into a raw Discord API payload structure.
   * @returns The serialized JSON payload structure.
   */
override toJSON(): APIChannelSelectComponent {
    return this.buildJSON(ComponentType.ChannelSelect) as unknown as APIChannelSelectComponent;
  }
}

export const ChannelSelectMenuBuilder =
  ChannelSelectMenuBuilderClass as unknown as {
    new <
      CustomId extends string = string,
      Placeholder extends string = string,
    >(
      opts: ChannelSelectMenuOptions<CustomId, Placeholder>,
    ): ChannelSelectMenuBuilderInstance<CustomId>;
    from(data: APIChannelSelectComponent): ChannelSelectMenuBuilder;
  };
export type ChannelSelectMenuBuilder = ChannelSelectMenuBuilderClass;

/** @deprecated Use StringSelectMenuBuilder instead */
export const SelectMenuBuilder = StringSelectMenuBuilder;
/** @deprecated Use StringSelectMenuBuilder instead */
export type SelectMenuBuilder = StringSelectMenuBuilder;

