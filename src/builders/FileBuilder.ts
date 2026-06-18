import { ComponentType } from '../enums.ts';
import type { APIFileComponent } from '../types.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface FileOptions {
  /** The file URL - **must** use the `attachment://` scheme. */
  url: string;
  /** Whether to blur the file preview behind a spoiler overlay. */
  spoiler?: boolean;
}

export interface FileBuilderInstance extends FileBuilderClass {}

/**
 * Builds a File component (type 13) - displays an uploaded file attachment inline
 * inside a V2 message layout. Only works with the `IS_COMPONENTS_V2` message flag.
 *
 * The URL **must** use the `attachment://` scheme, referencing a file included in
 * the message's `attachments` array. External URLs are not supported.
 *
 * @example
 * ```ts
 * const file = new FileBuilder({ url: 'attachment://snayz_code.ts' });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#file Discord Docs - File}
 */
class FileBuilderClass extends BaseComponent<Partial<APIFileComponent>> {
  public override readonly type = ComponentType.File;

  /**
   * Recreates a {@link FileBuilder} from a raw Discord API payload.
   *
   * @param data - Raw file component payload from Discord.
   * @returns A fully hydrated `FileBuilderClass` instance.
   */
  public static from(data: APIFileComponent): FileBuilderClass {
    const raw = resolveRaw(data) as unknown as APIFileComponent & { url?: string };
    const builder = new FileBuilderClass({ url: raw.file?.url ?? raw.url ?? '' });
    if (raw.spoiler !== undefined) builder.setSpoiler(raw.spoiler);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The file attachment URL (`attachment://` scheme).
   * @readonly
   */
  public get url(): string | undefined {
    return this.data.file?.url;
  }

  /**
   * Whether the file preview is blurred behind a spoiler overlay.
   * @readonly
   */
  public get spoiler(): boolean | undefined {
    return this.data.spoiler;
  }

      /**
   * Creates a new FileBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: FileOptions) {
    super();
    this.data.type = ComponentType.File;
    if (opts.url !== undefined) this.setURL(opts.url);
    if (opts.spoiler !== undefined) this.setSpoiler(opts.spoiler);
  }

  /**
   * Sets the file attachment URL. The URL **must** start with `attachment://`.
   *
   * @param url - The attachment URL (e.g. `attachment://report.pdf`).
   * @returns This builder for chaining.
   * @throws If the URL does not use the `attachment://` scheme.
   *
   * @see {@link https://discord.com/developers/docs/reference#attachment-data Discord Docs - Attachment Data}
   */
  setURL(url: string): this {
    if (!url.startsWith('attachment://'))
      throw new Error(`[File] url must use the attachment:// scheme (got "${url}")`);
    this.data.file = { url };
    return this;
  }

  /**
   * Sets whether the file preview is hidden behind a spoiler overlay.
   *
   * @param spoiler - `true` to blur, `false` for normal display.
   * @returns This builder for chaining.
   */
  setSpoiler(spoiler: boolean): this {
    this.data.spoiler = spoiler;
    return this;
  }

  /**
   * Serializes this file component to the raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If no URL has been set.
   */
  override toJSON(): Record<string, unknown> {
    if (!this.url) throw new Error('[File] toJSON() requires a file url');
    const res: Record<string, unknown> = {
      type: ComponentType.File,
      file: { url: this.url },
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.spoiler !== undefined) res.spoiler = this.data.spoiler;
    return res;
  }
}

export const FileBuilder = FileBuilderClass as unknown as {
  new (opts: FileOptions): FileBuilderInstance;
  from(data: APIFileComponent): FileBuilder;
};

export type FileBuilder = FileBuilderClass;