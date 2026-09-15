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

/** Maximum number of file type filters a file upload may whitelist. */
const MAX_FILE_TYPES = 10;

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
   * Minimum number of files required to upload (0-10).
   * Set to `0` only when `required` is `false`.
   */
  minValues?: MinValues;
  /** Alias for {@link minValues} using the raw API field name. */
  min_values?: MinValues;
  /** Maximum number of files allowed to upload (1-10). */
  maxValues?: MaxValues;
  /** Alias for {@link maxValues} using the raw API field name. */
  max_values?: MaxValues;
  /** Whether at least one file must be uploaded. Defaults to `true`. */
  required?: boolean;
  /** File type filters: `image`, `video`, `audio`, or dot-prefixed extensions such as `.pdf` (max 10). */
  fileTypes?: string[];
  /** Alias for {@link fileTypes} using the raw API field name. */
  file_types?: string[];
}

/**
 * Config options for a new FileUploadBuilder.
 */
export type FileUploadOptions = BaseFileUploadOptions;

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
 * @see {@link https://docs.discord.com/developers/components/reference#file-upload Discord Docs - File Upload}
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
    const builder = new FileUploadBuilderClass({ customId: raw.custom_id } as unknown as FileUploadOptions);
    if (raw.required !== undefined) builder.setRequired(raw.required);
    if (raw.min_values !== undefined) builder.setMinValues(raw.min_values as FileUploadRange);
    if (raw.max_values !== undefined) builder.setMaxValues(raw.max_values as FileUploadRange);
    if (raw.file_types !== undefined) builder.setFileTypes(raw.file_types);
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

  /**
   * File category or dot-prefixed extension filters the user is allowed to upload.
   * @readonly
   */
  public get fileTypes(): readonly string[] | undefined {
    return this.data.file_types;
  }

  /**
   * Validates the upload count bounds.
   *
   * Discord defaults a file upload's `required` flag to `true`, so
   * `minValues: 0` requires an explicit `required: false`.
   *
   * @see {@link https://docs.discord.com/developers/components/reference#file-upload}
   */
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
   * Validates file categories (`image`, `video`, `audio`) and dot-prefixed extensions.
   *
   * @param fileTypes - The extensions to validate.
   * @throws If more than 10 entries are given, or any entry is empty.
   */
  private validateFileTypes(fileTypes: readonly string[]): void {
    if (fileTypes.length > MAX_FILE_TYPES)
      throw new Error(`fileTypes can't have more than ${MAX_FILE_TYPES} entries, but got ${fileTypes.length}`);
    for (let i = 0; i < fileTypes.length; i++) {
      if (!fileTypes[i]) throw new Error(`fileTypes[${i}] must be a non-empty file extension`);
      const fileType = fileTypes[i]!;
      if (fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' &&
        !(fileType.startsWith('.') && fileType.length > 1)) {
        throw new Error(`fileTypes[${i}] must be image, video, audio, or a dot-prefixed extension`);
      }
    }
  }

  /**
   * Creates a new FileUploadBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: FileUploadOptions) {
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

    const fileTypes = opts.fileTypes ?? opts.file_types;
    if (fileTypes !== undefined) this.setFileTypes(fileTypes);
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
   * Restricts uploads to file categories or dot-prefixed extensions (max 10 entries).
   *
   * @param fileTypes - The allowed filters, for example `['image', '.pdf']`.
   * @returns This builder for chaining.
   * @throws If more than 10 entries are given, or any entry is empty.
   *
   * @see {@link https://docs.discord.com/developers/reference#file-types}
   */
  setFileTypes(fileTypes: readonly string[]): this {
    this.validateFileTypes(fileTypes);
    this.data.file_types = fileTypes.slice();
    return this;
  }

  /**
   * Appends allowed file categories or dot-prefixed extensions (max 10 entries in total).
   *
   * @param fileTypes - The extensions to allow.
   * @returns This builder for chaining.
   * @throws If the total would exceed 10 entries, or any entry is empty.
   */
  addFileTypes(...fileTypes: readonly string[]): this {
    const current = this.data.file_types ?? [];
    const merged = new Array<string>(current.length + fileTypes.length);
    for (let i = 0; i < current.length; i++) merged[i] = current[i]!;
    for (let i = 0; i < fileTypes.length; i++) merged[current.length + i] = fileTypes[i]!;
    this.validateFileTypes(merged);
    this.data.file_types = merged;
    return this;
  }

  /**
   * Clears the allowed file extensions, letting the user upload any file type.
   * @returns This builder for chaining.
   */
  clearFileTypes(): this {
    delete this.data.file_types;
    return this;
  }

  /**
   * Serializes this file upload to the raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APIFileUploadComponent {
    if (this.data.custom_id === undefined) throw new Error('customId is required');
    this.validateCustomId(this.data.custom_id);
    this.validateFileUploadValues(this.data.min_values, this.data.max_values);
    if (this.data.file_types !== undefined) this.validateFileTypes(this.data.file_types);
    return this.data as APIFileUploadComponent;
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
  : ValidateSelectMenuRequired<Opts> extends { readonly error: string }
  ? ValidateSelectMenuRequired<Opts>
  : ValidateFileUploadValues<Opts>;

export const FileUploadBuilder = FileUploadBuilderClass as unknown as {
  new <
    MinValues extends FileUploadRange = FileUploadRange,
    MaxValues extends FileUploadRange = FileUploadRange,
    Opts extends BaseFileUploadOptions<MinValues, MaxValues> = BaseFileUploadOptions<MinValues, MaxValues>,
  >(
    opts?: Opts & ValidateFileUploadOptions<Opts>,
  ): FileUploadBuilderInstance<ExtractCustomId<Opts>>;
  from(data: APIFileUploadComponent): FileUploadBuilder;
};

/**
 * Alias for FileUploadBuilderClass.
 */
export type FileUploadBuilder = FileUploadBuilderClass;
