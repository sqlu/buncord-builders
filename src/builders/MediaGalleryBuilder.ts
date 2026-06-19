import { ComponentType } from '../enums.ts';
import type { APIMediaGalleryComponent, APIMediaGalleryItem } from '../types.ts';
import type { CheckArrayLength, CheckMediaUrl, CheckMaxLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface MediaGalleryItemOptions {
  /** Media URL - `http://`, `https://`, or `attachment://` scheme. */
  url: string;
  /** Alt text description for accessibility (max 1024 characters). */
  description?: string;
  /** Whether to blur the item behind a spoiler overlay. */
  spoiler?: boolean;
}

export type ValidateMediaGalleryItemOptions<Url extends string, Description extends string = string> =
  CheckMediaUrl<Url> extends { readonly error: string }
  ? CheckMediaUrl<Url>
  : CheckMaxLength<Url, 512, 'url'> extends { readonly error: string }
  ? CheckMaxLength<Url, 512, 'url'>
  : [Description] extends [never]
  ? unknown
  : CheckMaxLength<Description, 1024, 'description'> extends { readonly error: string }
  ? CheckMaxLength<Description, 1024, 'description'>
  : unknown;

/**
 * Represents a single item inside a {@link MediaGalleryBuilder}.
 * Each item wraps a media URL with optional alt text and spoiler flag.
 *
 * @see {@link https://discord.com/developers/docs/components/reference#media-gallery-item-structure Discord Docs - Media Gallery Item}
 */
class MediaGalleryItemBuilderClass {
  public data: Partial<APIMediaGalleryItem> = {};

  /**
   * Recreates a {@link MediaGalleryItemBuilder} from a raw Discord API payload.
   *
   * @param data - Raw media gallery item payload.
   * @returns A fully hydrated `MediaGalleryItemBuilderClass` instance.
   */
  public static from(data: APIMediaGalleryItem): MediaGalleryItemBuilderClass {
    const raw = resolveRaw(data) as unknown as APIMediaGalleryItem & { url?: string };
    const builder = new MediaGalleryItemBuilderClass({ url: raw.media?.url ?? raw.url ?? '' });
    if (raw.description !== undefined) builder.setDescription(raw.description);
    if (raw.spoiler !== undefined) builder.setSpoiler(raw.spoiler);
    return builder;
  }

  /**
   * The media URL (`http://`, `https://`, or `attachment://` scheme).
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
   * Whether this item is behind a spoiler blur.
   * @readonly
   */
  public get spoiler(): boolean | undefined {
    return this.data.spoiler;
  }

  /**
* Creates a new MediaGalleryItemBuilder instance.
* @param opts - Initial configuration options.
*/
  constructor(opts: MediaGalleryItemOptions) {
    if (opts.url !== undefined) this.setURL(opts.url);
    if (opts.description !== undefined) this.setDescription(opts.description);
    if (opts.spoiler !== undefined) this.setSpoiler(opts.spoiler);
  }

  /**
   * Sets the media URL (`http://`, `https://`, or `attachment://` required).
   *
   * @param url - The media URL to display.
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
   * Sets the alt text description (max 1024 characters).
   *
   * @param desc - The description text.
   * @returns This builder for chaining.
   * @throws If description exceeds 1024 characters.
   */
  setDescription(desc: string): this {
    if (desc.length > 1024)
      throw new Error(`description is too long, max is 1024 characters but got ${desc.length}`);
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
   * Sets whether this item is hidden behind a spoiler overlay.
   *
   * @param spoiler - `true` to blur the item.
   * @returns This builder for chaining.
   */
  setSpoiler(spoiler: boolean): this {
    this.data.spoiler = spoiler;
    return this;
  }

  /**
   * Serializes this item to the raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If no URL has been set.
   */
  toJSON(): APIMediaGalleryItem {
    if (!this.data.media?.url) throw new Error('need a media url to serialize toJSON');
    return this.data as APIMediaGalleryItem;
  }
}

export interface MediaGalleryItemBuilderInstance extends MediaGalleryItemBuilderClass { }

export const MediaGalleryItemBuilder = MediaGalleryItemBuilderClass as unknown as {
  new <
    Url extends string,
    Description extends string = string,
  >(
    opts: MediaGalleryItemOptions & {
      url: Url;
      description?: Description;
    } & ValidateMediaGalleryItemOptions<Url, Description>,
  ): MediaGalleryItemBuilderInstance;
  from(data: APIMediaGalleryItem): MediaGalleryItemBuilder;
};
export type MediaGalleryItemBuilder = MediaGalleryItemBuilderClass;

export interface MediaGalleryOptions<
  Items extends readonly MediaGalleryItemBuilder[] = MediaGalleryItemBuilder[],
> {
  /** Gallery items to display (1–10 entries required). */
  items: readonly [...Items] & CheckArrayLength<Items, 1, 10, 'items'>;
}

export interface MediaGalleryBuilderInstance<
  Items extends readonly MediaGalleryItemBuilder[] = readonly MediaGalleryItemBuilder[],
> extends MediaGalleryBuilderClass {
  readonly items: Items;
}

/**
 * Builds a Media Gallery component (type 12) - displays a grid of 1 to 10
 * images or videos inline inside a V2 message layout.
 *
 * Only works with the `IS_COMPONENTS_V2` message flag. Each item is a
 * {@link MediaGalleryItemBuilder} wrapping a URL with optional alt text.
 *
 * @example
 * ```ts
 * const gallery = new MediaGalleryBuilder({
 *   items: [
 *     new MediaGalleryItemBuilder({ url: 'https://example.com/cat.jpg', description: 'A cute cat' }),
 *     new MediaGalleryItemBuilder({ url: 'attachment://banner.png' }),
 *   ],
 * });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#media-gallery Discord Docs - Media Gallery}
 */
class MediaGalleryBuilderClass extends BaseComponent<Partial<APIMediaGalleryComponent>> {
  public override readonly type = ComponentType.MediaGallery;

  /**
   * Recreates a {@link MediaGalleryBuilder} from a raw Discord API payload.
   *
   * @param data - Raw media gallery payload from Discord.
   * @returns A fully hydrated `MediaGalleryBuilderClass` instance.
   */
  public static from(data: APIMediaGalleryComponent): MediaGalleryBuilderClass {
    const raw = resolveRaw(data) as unknown as APIMediaGalleryComponent;
    const items = (raw.items ?? []).map((i) => MediaGalleryItemBuilder.from(i));
    const builder = new MediaGalleryBuilderClass({ items });
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The media items inside this gallery (1-10 entries).
   * @readonly
   */
  public get items(): readonly MediaGalleryItemBuilder[] {
    return (this.data.items ?? []) as unknown as readonly MediaGalleryItemBuilder[];
  }

  /**
* Creates a new MediaGalleryBuilder instance.
* @param opts - Initial configuration options.
*/
  constructor(opts: MediaGalleryOptions<MediaGalleryItemBuilderClass[]>) {
    super();
    this.data.type = ComponentType.MediaGallery;
    const items = opts.items;
    if (!items || items.length === 0) {
      this.data.items = [];
    } else {
      const len = items.length;
      if (len > 10) throw new Error("items size can't be more than 10");
      this.data.items = items as unknown as APIMediaGalleryItem[];
    }
  }

  /**
   * Appends media items to the gallery (max 10 total).
   *
   * @param items - Items to add.
   * @returns This builder for chaining.
   * @throws If adding items would exceed 10.
   */
  addItems(...items: MediaGalleryItemBuilder[]): this {
    if (!this.data.items) this.data.items = [];
    const cur = this.data.items.length;
    const add = items.length;
    if (cur + add > 10)
      throw new Error("items size can't be more than 10");
    for (let i = 0; i < add; i++) {
      this.data.items.push(items[i] as unknown as APIMediaGalleryItem);
    }
    return this;
  }

  /**
   * Splices items in-place (result must keep 1-10 entries).
   *
   * @param index - Start index.
   * @param deleteCount - How many to remove.
   * @param items - Replacements to insert.
   * @returns This builder for chaining.
   */
  spliceItems(index: number, deleteCount: number, ...items: MediaGalleryItemBuilder[]): this {
    if (!this.data.items) this.data.items = [];
    (this.data.items as unknown as MediaGalleryItemBuilder[]).splice(index, deleteCount, ...items);
    this.validateArrayLength(this.data.items, 1, 10, 'items');
    return this;
  }

  /**
   * Serializes this media gallery to the raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If there are no items.
   */
  override toJSON(): APIMediaGalleryComponent {
    const raw = this.data.items;
    const len = raw ? raw.length : 0;
    if (len === 0) throw new Error('need at least one item to serialize');
    const serialized = new Array<APIMediaGalleryItem>(len);
    for (let i = 0; i < len; i++) {
      const item = raw![i];
      if (item) {
        serialized[i] = 'toJSON' in item && typeof item.toJSON === 'function'
          ? (item as { toJSON(): APIMediaGalleryItem }).toJSON()
          : (item as APIMediaGalleryItem);
      }
    }
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return {
      ...this.data,
      items: serialized,
    } as APIMediaGalleryComponent;
  }
}

export const MediaGalleryBuilder = MediaGalleryBuilderClass as unknown as {
  new <
    ItemType extends MediaGalleryItemBuilder = MediaGalleryItemBuilder,
    Items extends readonly ItemType[] = readonly ItemType[],
  >(
    opts: MediaGalleryOptions<Items>,
  ): MediaGalleryBuilderInstance<Items>;
  from(data: APIMediaGalleryComponent): MediaGalleryBuilder;
};

export type MediaGalleryBuilder = MediaGalleryBuilderClass;
