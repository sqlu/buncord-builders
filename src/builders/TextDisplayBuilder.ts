import { ComponentType } from '../enums.ts';
import type { APITextDisplayComponent } from '../types.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export interface TextDisplayOptions {
  /** The markdown content to display (1–4000 characters). */
  content: string;
}

export interface TextDisplayBuilderInstance extends TextDisplayBuilderClass {}

/**
 * Builds a Text Display component (type 10) - renders a block of markdown text
 * inside a V2 message layout.
 *
 * Content supports standard Discord markdown (bold, italic, headers, lists, etc.)
 * and must be between 1 and 4000 characters.
 *
 * @example
 * ```ts
 * const text = new TextDisplayBuilder({ content: '## discordts-builders' });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#text-display Discord Docs - Text Display}
 */
class TextDisplayBuilderClass extends BaseComponent<Partial<APITextDisplayComponent>> {
  public override readonly type = ComponentType.TextDisplay;

  /**
   * Recreates a {@link TextDisplayBuilder} from a raw Discord API payload.
   *
   * @param data - Raw text display payload from Discord.
   * @returns A fully hydrated `TextDisplayBuilderClass` instance.
   */
  public static from(data: APITextDisplayComponent): TextDisplayBuilderClass {
    const raw = resolveRaw(data) as unknown as APITextDisplayComponent;
    const builder = new TextDisplayBuilderClass({ content: raw.content });
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * The raw markdown content string (1-4000 characters).
   * @readonly
   */
  public get content(): string | undefined {
    return this.data.content;
  }

      /**
   * Creates a new TextDisplayBuilder instance.
   * @param opts - Initial configuration options.
   */
constructor(opts: TextDisplayOptions) {
    super();
    this.data.type = ComponentType.TextDisplay;
    if (opts.content !== undefined) this.setContent(opts.content);
  }

  /**
   * Sets the markdown text content (1-4000 characters).
   *
   * @param content - The markdown string to display.
   * @returns This builder for chaining.
   * @throws If content is empty or longer than 4000 characters.
   */
  setContent(content: string): this {
    if (content.length < 1 || content.length > 4000)
      throw new Error(`content must be between 1 and 4000 characters, but you gave me ${content.length}`);
    this.data.content = content;
    return this;
  }

  /**
   * Serializes this text display to the raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APITextDisplayComponent {
    const res: APITextDisplayComponent = {
      type: ComponentType.TextDisplay,
      content: this.data.content ?? '',
    };
    if (this.id !== undefined) res.id = this.id;
    return res;
  }
}

export const TextDisplayBuilder = TextDisplayBuilderClass as unknown as {
  new (opts: TextDisplayOptions): TextDisplayBuilderInstance;
  from(data: APITextDisplayComponent): TextDisplayBuilder;
};

export type TextDisplayBuilder = TextDisplayBuilderClass;
