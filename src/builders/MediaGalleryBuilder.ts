import { ComponentType } from '../enums.ts';
import type { APIMediaGalleryComponent, APIMediaGalleryItem } from '../types.ts';
import type { CheckArrayLength, CheckMediaUrl, CheckMaxLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new MediaGalleryItemBuilder.
 */
export interface MediaGalleryItemOptions {
  /** Media URL - `http://`, `https://`, or `attachment://` scheme. */
  url?: string;
  /** Alt description text (up to 1024 chars). */
  description?: string;
  /** Whether to blur the item behind a spoiler overlay. */
  spoiler?: boolean;
}

/**
 * Type-level validation for MediaGalleryItemOptions.
 * @template Url The media URL string literal.
 * @template Description The description string literal.
 */
export type ValidateMediaGalleryItemOptions<Url extends string, Description extends string = string> =
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
 * Represents a single item inside a {@link MediaGalleryBuilder}.
 * Each item wraps a media URL with optional alt text and spoiler flag.
 *
 * @see {@link https://discord.com/developers/docs/components/reference#media-gallery-item-structure Discord Docs - Media Gallery Item}
 */
class MediaGalleryItemBuilderClass {
  public data: Partial<APIMediaGalleryItem> = {};

  /**
   * Loads a {@link MediaGalleryItemBuilder} from raw Discord data.
   *
   * @param data - Raw media gallery item payload.
   * @returns Populated `MediaGalleryItemBuilderClass` instance.
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
   * Creates a new MediaGalleryItemBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: MediaGalleryItemOptions) {
    if (!opts) return;
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
   * Convert to raw Discord API payload.
   *
   * @returns The JSON representation.
   * @throws If no URL has been set.
   */
  toJSON(): APIMediaGalleryItem {
    if (!this.data.media?.url) throw new Error('need a media url to serialize toJSON');
    return this.data as APIMediaGalleryItem;
  }
}

/**
 * Interface for a configured MediaGalleryItemBuilderClass.
 */
export interface MediaGalleryItemBuilderInstance extends MediaGalleryItemBuilderClass { }

export const MediaGalleryItemBuilder = MediaGalleryItemBuilderClass as unknown as {
  new <
    Url extends string = string,
    Description extends string = string,
  >(
    opts?: MediaGalleryItemOptions & {
      url?: Url;
      description?: Description;
    } & ValidateMediaGalleryItemOptions<Url, Description>,
  ): MediaGalleryItemBuilderInstance;
  from(data: APIMediaGalleryItem): MediaGalleryItemBuilder;
};
/**
 * Alias for MediaGalleryItemBuilderClass.
 */
export type MediaGalleryItemBuilder = MediaGalleryItemBuilderClass;

/**
 * Config options for a new MediaGalleryBuilder.
 * @template Items The array type of MediaGalleryItemBuilder.
 */
export interface MediaGalleryOptions<
  Items extends readonly MediaGalleryItemBuilder[] = MediaGalleryItemBuilder[],
> {
  /** Gallery items to display (1–10 entries required). */
  items?: readonly [...Items] & CheckArrayLength<Items, 1, 10, 'items'>;
}

/**
 * Interface for a fully configured MediaGalleryBuilder.
 * @template Items The items contained in the gallery.
 */
export interface MediaGalleryBuilderInstance<
  Items extends readonly MediaGalleryItemBuilder[] = readonly MediaGalleryItemBuilder[],
> extends MediaGalleryBuilderClass {
  /** The child items configured in the gallery. */
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
   * Loads a {@link MediaGalleryBuilder} from raw Discord data.
   *
   * @param data - Raw media gallery payload from Discord.
   * @returns Populated `MediaGalleryBuilderClass` instance.
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
   * Creates a new MediaGalleryBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: MediaGalleryOptions<MediaGalleryItemBuilderClass[]>) {
    if (!opts) {
      super({
        type: ComponentType.MediaGallery,
        items: [],
      } as unknown as Partial<APIMediaGalleryComponent>);
      return;
    }
    const items = opts.items;
    if (items !== undefined) {
      const len = items.length;
      if (len > 10) throw new Error("items size can't be more than 10");
    }
    const payload = {
      type: ComponentType.MediaGallery,
      items: (items ?? []) as unknown as APIMediaGalleryItem[],
    } as unknown as Partial<APIMediaGalleryComponent>;
    super(payload);
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
    let serialized = raw as unknown as APIMediaGalleryItem[];
    if (raw) {
      let hasBuilder = false;
      for (let i = 0; i < len; i++) {
        const item = raw[i];
        if (item && typeof (item as unknown as Record<string, unknown>).toJSON === 'function') {
          hasBuilder = true;
          break;
        }
      }
      if (hasBuilder) {
        serialized = new Array<APIMediaGalleryItem>(len);
        for (let i = 0; i < len; i++) {
          const item = raw[i]!;
          serialized[i] = typeof (item as unknown as Record<string, unknown>).toJSON === 'function'
            ? (item as unknown as { toJSON(): APIMediaGalleryItem }).toJSON()
            : (item as APIMediaGalleryItem);
        }
      }
    }
    const data = this.data;
    return {
      type: ComponentType.MediaGallery,
      items: serialized,
      id: this.id !== undefined ? this.id : data.id,
    } as unknown as APIMediaGalleryComponent;
  }
}

export const MediaGalleryBuilder = MediaGalleryBuilderClass as unknown as {
  new <
    ItemType extends MediaGalleryItemBuilder = MediaGalleryItemBuilder,
    Items extends readonly ItemType[] = readonly ItemType[],
  >(
    opts?: MediaGalleryOptions<Items>,
  ): MediaGalleryBuilderInstance<Items>;
  from(data: APIMediaGalleryComponent): MediaGalleryBuilder;
};

/**
 * Alias for MediaGalleryBuilderClass.
 */
export type MediaGalleryBuilder = MediaGalleryBuilderClass;
