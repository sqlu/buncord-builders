import { ComponentType } from '../enums.ts';
import type { APIThumbnailComponent } from '../types.ts';
import type { CheckMediaUrl, CheckMaxLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new ThumbnailBuilder.
 */
export interface ThumbnailOptions {
  /** Image URL (http/https/attachment scheme). */
  url?: string;
  /** Alt description text (up to 1024 chars). */
  description?: string;
  /** Blur behind a spoiler? */
  spoiler?: boolean;
}

/**
 * Type-level validation for ThumbnailOptions.
 * @template Url The image URL string literal.
 * @template Description The description string literal.
 */
export type ValidateThumbnailOptions<Url extends string, Description extends string = string> =
  [Url] extends [never]
  ? ([Description] extends [never]
      ? unknown
      : CheckMaxLength<Description, 1024, 'description'> extends { readonly error: string }
      ? CheckMaxLength<Description, 1024, 'description'>
      : unknown)
  : CheckMediaUrl<Url> extends { readonly error: string }
  ? CheckMediaUrl<Url>
  : CheckMaxLength<Url, 512, 'url'> extends { readonly error: string }
  ? CheckMaxLength<Url, 512, 'url'>
  : [Description] extends [never]
  ? unknown
  : CheckMaxLength<Description, 1024, 'description'> extends { readonly error: string }
  ? CheckMaxLength<Description, 1024, 'description'>
  : unknown;

/**
 * Interface for a fully configured ThumbnailBuilder.
 */
export interface ThumbnailBuilderInstance extends ThumbnailBuilderClass { }

/**
 * Builds a Thumbnail component: renders a small image on the right
 * side of a {@link SectionBuilder} as an accessory.
 *
 * The URL can reference external images (`https://`) or an uploaded attachment
 * (`attachment://filename.ext`). Note: attachment URLs only resolve in messages
 * that also contain that attachment.
 *
 * @example
 * ```ts
 * const thumb = new ThumbnailBuilder({
 *   url: 'https://cdn.example.com/avatar.png',
 *   description: 'User avatar',
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#thumbnail Discord Docs - Thumbnail}
 */
class ThumbnailBuilderClass extends BaseComponent<Partial<APIThumbnailComponent>> {
  public override readonly type = ComponentType.Thumbnail;

  /**
   * Loads a {@link ThumbnailBuilder} from raw Discord data.
   *
   * @param data - Raw thumbnail payload from Discord.
   * @returns Populated `ThumbnailBuilderClass` instance.
   */
  public static from(data: APIThumbnailComponent): ThumbnailBuilderClass {
    const raw = resolveRaw(data) as unknown as APIThumbnailComponent & { url?: string };
    const builder = new ThumbnailBuilderClass({ url: raw.media?.url ?? raw.url ?? '' });
    if (raw.description !== undefined) builder.setDescription(raw.description);
    if (raw.spoiler !== undefined) builder.setSpoiler(raw.spoiler);
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The image URL (`http://`, `https://`, or `attachment://` scheme).
   * @readonly
   */
  public get url(): string | undefined {
    return this.data.media?.url;
  }

  /**
   * Alt text description for accessibility.
   * @readonly
   */
  public get description(): string | undefined {
    return this.data.description;
  }

  /**
   * Whether the thumbnail is behind a spoiler overlay.
   * @readonly
   */
  public get spoiler(): boolean | undefined {
    return this.data.spoiler;
  }

  /**
   * Creates a new ThumbnailBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: ThumbnailOptions) {
    super();
    this.data.type = ComponentType.Thumbnail;
    if (!opts) return;
    if (opts.url !== undefined) this.setURL(opts.url);
    if (opts.description !== undefined) this.setDescription(opts.description);
    if (opts.spoiler !== undefined) this.setSpoiler(opts.spoiler);
  }

  /**
   * Sets the image URL (`http://`, `https://`, or `attachment://` required).
   *
   * @param url - The image URL to display.
   * @returns This builder for chaining.
   * @throws If URL uses an unsupported scheme.
   */
  setURL(url: CheckMediaUrl<string> & CheckMaxLength<string, 512, 'url'>): this {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('attachment://'))
      throw new Error(`url must be http/https or attachment:// (got "${url}")`);
    this.data.media = { url };
    return this;
  }

  /**
   * Sets the alt text description for accessibility (max 1024 characters).
   *
   * @param desc - The description text.
   * @returns This builder for chaining.
   * @throws If description exceeds 1024 characters.
   */
  setDescription(desc: CheckMaxLength<string, 1024, 'description'>): this {
    this.validateLength(desc, 1024, 'description');
    this.data.description = desc;
    return this;
  }

  /**
   * Clears the alt description text.
   * @returns This builder for chaining.
   */
  clearDescription(): this {
    delete this.data.description;
    return this;
  }

  /**
   * Sets whether the thumbnail is hidden behind a spoiler overlay.
   *
   * @param spoiler - `true` to blur behind spoiler, `false` to show normally.
   * @returns This builder for chaining.
   */
  setSpoiler(spoiler: boolean): this {
    this.data.spoiler = spoiler;
    return this;
  }

  /**
   * Convert to raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If no URL has been set.
   */
  override toJSON(): APIThumbnailComponent {
    if (!this.data.media?.url) throw new Error('need a media url to serialize toJSON');
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return this.data as APIThumbnailComponent;
  }
}

export const ThumbnailBuilder = ThumbnailBuilderClass as unknown as {
  new <
    Url extends string = string,
    Description extends string = string,
  >(
    opts?: ThumbnailOptions & {
      url?: Url;
      description?: Description;
    } & ValidateThumbnailOptions<Url, Description>,
  ): ThumbnailBuilderInstance;
  from(data: APIThumbnailComponent): ThumbnailBuilder;
};

/**
 * Alias for ThumbnailBuilderClass.
 */
export type ThumbnailBuilder = ThumbnailBuilderClass;
