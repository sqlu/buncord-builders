import { ComponentType } from '../enums.ts';
import type { APICheckboxComponent } from '../types.ts';
import { BaseComponent, resolveRaw } from './base.ts';

import type {
  ExtractCustomId,
  GetCustomIdField,
  CheckStringConstraints,
  CheckMinLength,
  CheckMaxLength,
} from '../utils/guards.ts';

export interface CheckboxOptions<CustomId extends string = string> {
  /** Whether the checkbox is checked by default when the modal opens. */
  default?: boolean;
  customId?: CustomId;
  custom_id?: CustomId;
}

export type ValidateCheckboxOptions<Opts> =
  CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : Opts extends { customId: string } | { custom_id: string }
  ? unknown
  : { readonly error: 'Checkbox requires a customId or custom_id property' };

export interface CheckboxBuilderInstance<CustomId extends string>
  extends CheckboxBuilderClass {
  readonly customId: CustomId;
}

/**
 * Builds a Checkbox component (type 23) for use inside modal forms.
 * Represents a single togglable checkbox: the user can check or uncheck it.
 *
 * **Modal-only**: must be wrapped in a {@link LabelBuilder} to display a label.
 * For multiple-choice checkboxes, use {@link CheckboxGroupBuilder} instead.
 *
 * @example
 * ```ts
 * const checkbox = new CheckboxBuilder({ customId: 'accept_terms', default: false });
 * // wrap it with a label:
 * const field = new LabelBuilder({
 *   label: 'I accept the Terms of Service',
 *   component: checkbox,
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#checkbox Checkbox Discord Docs}
 */
class CheckboxBuilderClass extends BaseComponent<Partial<APICheckboxComponent>> {
  public override readonly type = ComponentType.Checkbox;

  /**
   * Recreates a {@link CheckboxBuilder} from a raw Discord API payload.
   *
   * @param data - Raw checkbox payload from Discord.
   * @returns A fully hydrated `CheckboxBuilderClass` instance.
   */
  public static from(data: APICheckboxComponent): CheckboxBuilderClass {
    const raw = resolveRaw(data) as unknown as APICheckboxComponent;
    const builder = new CheckboxBuilderClass({ customId: raw.custom_id });
    if (raw.default !== undefined) builder.setDefault(raw.default);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The custom identifier sent back on modal submit.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Whether the checkbox is pre-checked when the modal opens.
   * @readonly
   */
  public get default(): boolean | undefined {
    return this.data.default;
  }

  /**
* Creates a new CheckboxBuilder instance.
* @param opts - Initial configuration options.
*/
  constructor(opts: CheckboxOptions<string>) {
    super();
    this.data.type = ComponentType.Checkbox;

    const cid = opts.customId ?? opts.custom_id;
    if (!cid) throw new Error('customId is required');
    this.validateCustomId(cid);

    this.data.custom_id = cid;
    if (opts.default !== undefined) this.data.default = opts.default;
  }

  /**
* Sets the custom identifier for this component (maximum of 100 characters).
* @param cid - The unique custom identifier.
* @returns This builder instance for chaining.
*/
  setCustomId(cid: CheckMinLength<string, 1, 'customId'> & CheckMaxLength<string, 100, 'customId'>): this {
    this.validateCustomId(cid);
    this.data.custom_id = cid;
    return this;
  }

  /**
   * Sets whether the checkbox starts pre-checked when the modal opens.
   *
   * @param val - `true` to start checked, `false` for unchecked.
   * @returns This builder for chaining.
   */
  setDefault(val: boolean): this {
    this.data.default = val;
    return this;
  }

  /**
   * Serializes this checkbox to the raw Discord API payload.
   *
   * @returns The JSON representation.
   *
   * @see {@link https://discord.com/developers/docs/components/reference#checkbox Checkbox Discord Doc}
   */
  override toJSON(): APICheckboxComponent {
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return this.data as APICheckboxComponent;
  }
}

export const CheckboxBuilder = CheckboxBuilderClass as unknown as {
  new <
    CustomId extends string = string,
    Opts extends CheckboxOptions<CustomId> = CheckboxOptions<CustomId>,
  >(
    opts: Opts & ValidateCheckboxOptions<Opts>,
  ): CheckboxBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APICheckboxComponent): CheckboxBuilder;
};

export type CheckboxBuilder = CheckboxBuilderClass;
