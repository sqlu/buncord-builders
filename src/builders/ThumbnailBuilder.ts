import { ComponentType } from '../enums.ts';
import type { APIThumbnailComponent } from '../types.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface ThumbnailOptions {
  /** Image URL - must use `http://`, `https://`, or `attachment://` scheme. */
  url: string;
  /** Alt text description for accessibility (max 1024 characters). */
  description?: string;
  /** Whether to blur the thumbnail behind a spoiler overlay. */
  spoiler?: boolean;
}

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
   * Recreates a {@link ThumbnailBuilder} from a raw Discord API payload.
   *
   * @param data - Raw thumbnail payload from Discord.
   * @returns A fully hydrated `ThumbnailBuilderClass` instance.
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
* Creates a new ThumbnailBuilder instance.
* @param opts - Initial configuration options.
*/
  constructor(opts: ThumbnailOptions) {
    super();
    this.data.type = ComponentType.Thumbnail;
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
  setURL(url: string): this {
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
  setDescription(desc: string): this {
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
   * Serializes this thumbnail to the raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If no URL has been set.
   */
  override toJSON(): APIThumbnailComponent {
    if (!this.url) throw new Error('need a media url to serialize toJSON');
    const res: APIThumbnailComponent = {
      type: ComponentType.Thumbnail,
      media: { url: this.url },
    };
    if (this.id !== undefined) res.id = this.id;
    if (this.data.description !== undefined) res.description = this.data.description;
    if (this.data.spoiler !== undefined) res.spoiler = this.data.spoiler;
    return res;
  }
}

export const ThumbnailBuilder = ThumbnailBuilderClass as unknown as {
  new(opts: ThumbnailOptions): ThumbnailBuilderInstance;
  from(data: APIThumbnailComponent): ThumbnailBuilder;
};

export type ThumbnailBuilder = ThumbnailBuilderClass;
