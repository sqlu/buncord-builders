import { ComponentType } from '../enums.ts';
import type { APILabelComponent, APILabelComponentChild } from '../types.ts';
import type { CheckMaxLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';
import type { TextInputBuilder } from './TextInputBuilder.ts';
import type { CheckboxBuilder } from './CheckboxBuilder.ts';
import type { CheckboxGroupBuilder } from './CheckboxGroupBuilder.ts';
import type { RadioGroupBuilder } from './RadioGroupBuilder.ts';
import type { FileUploadBuilder } from './FileUploadBuilder.ts';
import type {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
} from './SelectMenuBuilders.ts';

// Accepted types inside a Label
const SELECT_TYPES = new Set<number>([
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
]);

const ALLOWED_LABEL_TYPES = new Set<number>([
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
  ComponentType.TextInput,
  ComponentType.Checkbox,
  ComponentType.CheckboxGroup,
  ComponentType.RadioGroup,
  ComponentType.FileUpload,
]);

/**
 * Union type of all component types that can be wrapped by a {@link LabelBuilder}.
 */
export type LabelComponentBuilder =
  | TextInputBuilder
  | CheckboxBuilder
  | CheckboxGroupBuilder
  | RadioGroupBuilder
  | FileUploadBuilder
  | StringSelectMenuBuilder
  | UserSelectMenuBuilder
  | RoleSelectMenuBuilder
  | MentionableSelectMenuBuilder
  | ChannelSelectMenuBuilder;

export interface LabelOptions<
  Label extends string = string,
  Component extends LabelComponentBuilder = LabelComponentBuilder,
  Description extends string = string,
> {
  /** The label text shown above or beside the component (max 45 characters). */
  label: Label & CheckMaxLength<Label, 45, 'Label'>;
  /** The interactive component this label is paired with. */
  component: Component;
  /** Optional description shown below the label (max 100 characters). */
  description?: Description & CheckMaxLength<Description, 100, 'Description'>;
}

export interface LabelBuilderInstance<Component extends LabelComponentBuilder>
  extends LabelBuilderClass {
  readonly component: Component;
}

/**
 * Builds a Label component (type 18) for use inside modals.
 * Pairs a text label (and optional description) with an interactive input
 * component, replacing the legacy `label` field on text inputs.
 *
 * A Label can wrap: `TextInput`, `Checkbox`, `CheckboxGroup`, `RadioGroup`,
 * `FileUpload`, and all five select menu types.
 *
 * **Modal-only** - cannot appear in regular message components.
 *
 * @example
 * ```ts
 * const field = new LabelBuilder({
 *   label: Snayz Developer ID',
 *   description: 'Enter your developer ID',
 *   component: new TextInputBuilder({ customId: 'dev_id', style: TextInputStyle.Short }),
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#label Discord Docs - Label}
 */
class LabelBuilderClass extends BaseComponent<Partial<APILabelComponent>> {
  public override readonly type = ComponentType.Label;

  /**
   * Recreates a {@link LabelBuilder} from a raw Discord API payload.
   *
   * @param data - Raw label payload from Discord.
   * @returns A fully hydrated `LabelBuilderClass` instance.
   */
  public static from(data: APILabelComponent): LabelBuilderClass {
    const raw = resolveRaw(data) as unknown as APILabelComponent;
    const comp = raw.component ? BaseComponent.resolve!(raw.component) : undefined;
    const builder = new LabelBuilderClass({
      label: raw.label,
      component: comp as LabelComponentBuilder,
    } as unknown as LabelOptions<string, LabelComponentBuilder, string>);
    if (raw.description !== undefined) builder.setDescription(raw.description);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The label text (max 45 characters).
   * @readonly
   */
  public get label(): string | undefined {
    return this.data.label;
  }

  /**
   * The optional description shown below the label text (max 100 characters).
   * @readonly
   */
  public get description(): string | undefined {
    return this.data.description;
  }

  /**
   * The interactive component this label is paired with.
   * @readonly
   */
  public get component(): LabelComponentBuilder | undefined {
    return (this.data as Record<string, unknown>).component as LabelComponentBuilder | undefined;
  }

      /**
   * Creates a new LabelBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: LabelOptions<string, LabelComponentBuilder, string>) {
    super();
    this.data.type = ComponentType.Label;

    if (!opts.label) throw new Error('label is required');
    this.validateLength(opts.label, 45, 'label');
    if (!opts.component) throw new Error('component is required');
    const compType = opts.component.type;
    if (compType === undefined || !ALLOWED_LABEL_TYPES.has(compType))
      throw new Error(`component type ${compType} is not allowed inside a Label`);
    if (opts.description !== undefined)
      this.validateLength(opts.description, 100, 'description');

    this.data.label = opts.label;
    (this.data as Record<string, unknown>).component = opts.component;
    if (opts.description !== undefined) this.data.description = opts.description;
  }

  /**
   * Sets the label text.
   *
   * @param lbl - The text to display as the field label.
   * @returns This builder for chaining.
   * @throws If label exceeds 45 characters.
   */
  setLabel(lbl: string): this {
    this.validateLength(lbl, 45, 'label');
    this.data.label = lbl;
    return this;
  }

  /**
   * Sets the description text shown below the label.
   *
   * @param desc - The description string.
   * @returns This builder for chaining.
   * @throws If description exceeds 100 characters.
   */
  setDescription(desc: string): this {
    this.validateLength(desc, 100, 'description');
    this.data.description = desc;
    return this;
  }

  /**
   * Clears the description text.
   * @returns This builder for chaining.
   */
  clearDescription(): this {
    delete this.data.description;
    return this;
  }

      /**
   * Shortcut to set a  component for this label.
   * @param comp - The Builder instance.
   * @returns This builder instance for chaining.
   */
  setComponent(comp: LabelComponentBuilder): this {
    const compType = comp?.type;
    if (compType === undefined || !ALLOWED_LABEL_TYPES.has(compType))
      throw new Error(`component type ${compType} is not allowed inside a Label`);
    (this.data as Record<string, unknown>).component = comp;
    return this;
  }

  private validateModalComponent(payload: Record<string, unknown>): void {
    if (SELECT_TYPES.has(payload.type as number)) {
      if (payload.disabled !== undefined)
        throw new Error('disabled cannot be set on select menus inside modals');
      if (payload.min_values === 0 && payload.required !== false)
        throw new Error('select minValues can only be 0 if required is false');
    }
    if (payload.type === ComponentType.FileUpload) {
      if (payload.min_values === 0 && payload.required !== false)
        throw new Error('file upload minValues can only be 0 if required is false');
    }
    if (payload.type === ComponentType.CheckboxGroup) {
      const options = Array.isArray(payload.options) ? payload.options : [];
      if (options.length < 2 || options.length > 10)
        throw new Error(`checkbox group options must have between 2 and 10 entries (got ${options.length})`);
      if (payload.min_values === 0 && payload.required !== false)
        throw new Error('checkbox group minValues can only be 0 if required is false');
    }
  }

  // Shortcuts for different component types
      /**
   * Shortcut to set a TextInput component for this label.
   * @param comp - The TextInputBuilder instance.
   * @returns This builder instance for chaining.
   */
  setTextInputComponent(comp: TextInputBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a Checkbox component for this label.
   * @param comp - The CheckboxBuilder instance.
   * @returns This builder instance for chaining.
   */
  setCheckboxComponent(comp: CheckboxBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a CheckboxGroup component for this label.
   * @param comp - The CheckboxGroupBuilder instance.
   * @returns This builder instance for chaining.
   */
  setCheckboxGroupComponent(comp: CheckboxGroupBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a RadioGroup component for this label.
   * @param comp - The RadioGroupBuilder instance.
   * @returns This builder instance for chaining.
   */
  setRadioGroupComponent(comp: RadioGroupBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a FileUpload component for this label.
   * @param comp - The FileUploadBuilder instance.
   * @returns This builder instance for chaining.
   */
  setFileUploadComponent(comp: FileUploadBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a StringSelectMenu component for this label.
   * @param comp - The StringSelectMenuBuilder instance.
   * @returns This builder instance for chaining.
   */
  setStringSelectMenuComponent(comp: StringSelectMenuBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a UserSelectMenu component for this label.
   * @param comp - The UserSelectMenuBuilder instance.
   * @returns This builder instance for chaining.
   */
  setUserSelectMenuComponent(comp: UserSelectMenuBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a RoleSelectMenu component for this label.
   * @param comp - The RoleSelectMenuBuilder instance.
   * @returns This builder instance for chaining.
   */
  setRoleSelectMenuComponent(comp: RoleSelectMenuBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a MentionableSelectMenu component for this label.
   * @param comp - The MentionableSelectMenuBuilder instance.
   * @returns This builder instance for chaining.
   */
  setMentionableSelectMenuComponent(comp: MentionableSelectMenuBuilder): this { return this.setComponent(comp); }
      /**
   * Shortcut to set a ChannelSelectMenu component for this label.
   * @param comp - The ChannelSelectMenuBuilder instance.
   * @returns This builder instance for chaining.
   */
  setChannelSelectMenuComponent(comp: ChannelSelectMenuBuilder): this { return this.setComponent(comp); }

  /**
   * Serializes this label to the raw Discord API payload.
   *
   * @returns The JSON representation.
   */
  override toJSON(): APILabelComponent {
    const comp = (this.data as Record<string, unknown>).component as { toJSON?: () => unknown } | null;
    const component = comp && typeof comp.toJSON === 'function' ? comp.toJSON() : comp;
    if (component && typeof component === 'object')
      this.validateModalComponent(component as Record<string, unknown>);
    const res: APILabelComponent = {
      type: ComponentType.Label,
      label: this.data.label ?? '',
      component: component as APILabelComponentChild,
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.description !== undefined) res.description = this.data.description;
    return res;
  }
}

export const LabelBuilder = LabelBuilderClass as unknown as {
  new <
    Label extends string,
    Component extends LabelComponentBuilder = LabelComponentBuilder,
    Description extends string = string,
  >(
    opts: LabelOptions<Label, Component, Description>,
  ): LabelBuilderInstance<Component>;
  from(data: APILabelComponent): LabelBuilder;
};

export type LabelBuilder = LabelBuilderClass;
