import { ComponentType } from '../enums.ts';
import type { APIFileUploadComponent } from '../types.ts';
import type {
  CheckMaxLength,
  CheckMinLength,
  FileUploadRange,
  ExtractCustomId,
  IsLessThanOrEqual,
  GetCustomIdField,
  CheckStringConstraints,
  ValidateSelectMenuRequired,
} from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Base options for configuring a new FileUploadBuilder.
 * @template MinValues The minimum number of files.
 * @template MaxValues The maximum number of files.
 */
export interface BaseFileUploadOptions<
  MinValues extends FileUploadRange = FileUploadRange,
  MaxValues extends FileUploadRange = FileUploadRange,
> {
  /** Custom ID sent on submit (up to 100 chars). */
  customId?: string;
  /** Alias for customId. */
  custom_id?: string;
  /**
   * Minimum number of files required to upload (0–10).
   * Set to `0` only when `required` is `false`.
   */
  minValues?: MinValues;
  /** Alias for {@link minValues} using the raw API field name. */
  min_values?: MinValues;
  /** Maximum number of files allowed to upload (1–10). */
  maxValues?: MaxValues;
  /** Alias for {@link maxValues} using the raw API field name. */
  max_values?: MaxValues;
  /** Whether at least one file must be uploaded. */
  required?: boolean;
}

/**
 * Config options for a new FileUploadBuilder.
 * @template CustomId The custom ID string literal.
 */
export type FileUploadOptions<CustomId extends string = string> =
  BaseFileUploadOptions;

/**
 * Interface for a fully configured FileUploadBuilder.
 * @template CustomId The custom ID of the file upload.
 */
export interface FileUploadBuilderInstance<CustomId extends string>
  extends FileUploadBuilderClass {
  /** The configured custom identifier of the file upload. */
  readonly customId: CustomId;
}

/**
 * Builds a File Upload component (type 19) for use inside modal forms.
 * Lets users attach one or more files as part of a modal submission.
 *
 * **Modal-only** - cannot appear in regular message components.
 *
 * File upload components are typically wrapped in a {@link LabelBuilder} to
 * display a descriptive label next to them.
 *
 * @example
 * ```ts
 * const upload = new FileUploadBuilder({
 *   customId: 'proof_docs',
 *   minValues: 1,
 *   maxValues: 5,
 *   required: true,
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#file-upload Discord Docs - File Upload}
 */
class FileUploadBuilderClass extends BaseComponent<Partial<APIFileUploadComponent>> {
  public override readonly type = ComponentType.FileUpload;

  /**
   * Loads a {@link FileUploadBuilder} from raw Discord data.
   *
   * @param data - Raw file upload payload from Discord.
   * @returns Populated `FileUploadBuilderClass` instance.
   */
  public static from(data: APIFileUploadComponent): FileUploadBuilderClass {
    const raw = resolveRaw(data) as unknown as APIFileUploadComponent;
    const builder = new FileUploadBuilderClass({ customId: raw.custom_id } as unknown as FileUploadOptions<string>);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values as FileUploadRange);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values as FileUploadRange);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Custom ID sent back on submit.
   * @readonly
   */
  public get customId(): string | undefined {
    return this.data.custom_id;
  }

  /**
   * Minimum files required to upload (0-10).
   * @readonly
   */
  public get minValues(): number | undefined {
    return this.data.min_values;
  }

  /**
   * Maximum files allowed to upload (1-10).
   * @readonly
   */
  public get maxValues(): number | undefined {
    return this.data.max_values;
  }

  /**
   * Whether at least one file must be uploaded before submitting.
   * @readonly
   */
  public get required(): boolean | undefined {
    return this.data.required;
  }

  private validateFileUploadValues(
    min: number | undefined,
    max: number | undefined,
    required: boolean | undefined = this.data.required,
  ): void {
    if (min !== undefined) this.validateRange(min, 0, 10, 'minValues');
    if (max !== undefined) this.validateRange(max, 1, 10, 'maxValues');
    if (min !== undefined && max !== undefined && min > max)
      throw new Error(`minValues can't be more than maxValues (you set minValues to ${min} and maxValues to ${max})`);
    if (min === 0 && required !== false)
      throw new Error('minValues can only be 0 if required is false');
  }

  /**
   * Creates a new FileUploadBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: FileUploadOptions<string>) {
    super();
    this.data.type = ComponentType.FileUpload;

    if (!opts) return;

    const cid = opts.customId ?? opts.custom_id;
    if (cid !== undefined) {
      this.validateCustomId(cid);
      this.data.custom_id = cid;
    }

    const min = opts.minValues ?? opts.min_values;
    const max = opts.maxValues ?? opts.max_values;
    this.validateFileUploadValues(min, max, opts.required);

    if (opts.required !== undefined) this.setRequired(opts.required);
    if (min !== undefined) this.setMinValues(min);
    if (max !== undefined) this.setMaxValues(max);
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
   * Sets the minimum number of files the user must upload (0-10).
   * Can only be `0` when `required` is `false`.
   *
   * @param min - The minimum value.
   * @returns This builder for chaining.
   * @throws If `min` is out of range or exceeds `maxValues`.
   */
  setMinValues(min: FileUploadRange): this {
    this.validateFileUploadValues(min, this.data.max_values);
    this.data.min_values = min;
    return this;
  }

  /**
   * Sets the maximum number of files the user may upload (1-10).
   *
   * @param max - The maximum value.
   * @returns This builder for chaining.
   * @throws If `max` is out of range or less than `minValues`.
   */
  setMaxValues(max: FileUploadRange): this {
    this.validateFileUploadValues(this.data.min_values, max);
    this.data.max_values = max;
    return this;
  }

  /**
   * Sets whether uploading at least one file is required to submit the modal.
   *
   * @param required - `true` if at least one file must be uploaded.
   * @returns This builder for chaining.
   * @throws If `required` conflicts with the current `minValues` setting.
   */
  setRequired(required: boolean): this {
    this.validateFileUploadValues(this.data.min_values, this.data.max_values, required);
    this.data.required = required;
    return this;
  }

  /**
   * Serializes this file upload to the raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): Record<string, unknown> {
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return this.data as Record<string, unknown>;
  }
}

type GetMinValues<Opts> =
  Opts extends { minValues: infer M }
  ? M
  : Opts extends { min_values: infer M }
  ? M
  : never;

type GetMaxValues<Opts> =
  Opts extends { maxValues: infer M }
  ? M
  : Opts extends { max_values: infer M }
  ? M
  : never;

type ValidateFileUploadValues<Opts> =
  [GetMinValues<Opts>] extends [never]
  ? unknown
  : [GetMaxValues<Opts>] extends [never]
  ? unknown
  : IsLessThanOrEqual<GetMinValues<Opts> & number, GetMaxValues<Opts> & number> extends true
  ? unknown
  : { readonly error: 'minValues cannot be greater than maxValues' };

/**
 * Type-level validation for FileUploadOptions.
 * @template Opts The user configuration options object.
 */
export type ValidateFileUploadOptions<Opts> =
  CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'> extends { readonly error: string }
  ? CheckStringConstraints<GetCustomIdField<Opts>, 1, 100, 'customId'>
  : Opts extends { customId: string; custom_id: string }
  ? { readonly error: 'Cannot specify both customId and custom_id' }
  : ValidateFileUploadValues<Opts>;

export const FileUploadBuilder = FileUploadBuilderClass as unknown as {
  new <
    MinValues extends FileUploadRange = FileUploadRange,
    MaxValues extends FileUploadRange = FileUploadRange,
    Opts extends BaseFileUploadOptions<MinValues, MaxValues> = BaseFileUploadOptions<MinValues, MaxValues>,
  >(
    opts?: Opts & ValidateFileUploadOptions<Opts> & ValidateSelectMenuRequired<Opts>,
  ): FileUploadBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APIFileUploadComponent): FileUploadBuilder;
};

/**
 * Alias for FileUploadBuilderClass.
 */
export type FileUploadBuilder = FileUploadBuilderClass;
