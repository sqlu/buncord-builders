import { ComponentType } from '../enums.ts';
import type { APITextDisplayComponent } from '../types.ts';
import type { CheckMaxLength, CheckMinLength } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

/**
 * Config options for a new TextDisplayBuilder.
 * @template Content The markdown content string literal.
 */
export interface TextDisplayOptions<Content extends string = string> {
  /** The markdown content to display (1–4000 characters). */
  content?: Content & CheckMinLength<Content, 1, 'content'> & CheckMaxLength<Content, 4000, 'content'>;
}

/**
 * Interface for a built TextDisplayBuilder.
 */
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
 * const text = new TextDisplayBuilder({ content: '## buncord-builders' });
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#text-display Discord Docs - Text Display}
 */
class TextDisplayBuilderClass extends BaseComponent<Partial<APITextDisplayComponent>> {
  public override readonly type = ComponentType.TextDisplay;

  /**
   * Loads a {@link TextDisplayBuilder} from raw Discord data.
   *
   * @param data - Raw text display payload from Discord.
   * @returns Populated `TextDisplayBuilderClass` instance.
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
   * Creates a new TextDisplayBuilder.
   * @param opts - Config options.
   */
  constructor(opts?: TextDisplayOptions<string>) {
    super();
    this.data.type = ComponentType.TextDisplay;
    if (!opts) return;
    if (opts.content !== undefined) this.setContent(opts.content);
  }

  /**
   * Sets the markdown text content (1-4000 characters).
   *
   * @param content - The markdown string to display.
   * @returns This builder for chaining.
   * @throws If content is empty or longer than 4000 characters.
   */
  setContent(content: CheckMinLength<string, 1, 'content'> & CheckMaxLength<string, 4000, 'content'>): this {
    if (content.length < 1 || content.length > 4000)
      throw new Error(`content must be between 1 and 4000 characters, but you gave me ${content.length}`);
    this.data.content = content;
    return this;
  }

  /**
   * Convert to raw Discord API payload.
   * @returns The JSON representation.
   */
  override toJSON(): APITextDisplayComponent {
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return this.data as APITextDisplayComponent;
  }
}

export const TextDisplayBuilder = TextDisplayBuilderClass as unknown as {
  new <Content extends string = string>(opts?: TextDisplayOptions<Content>): TextDisplayBuilderInstance;
  from(data: APITextDisplayComponent): TextDisplayBuilder;
};

/**
 * Alias for TextDisplayBuilderClass.
 */
export type TextDisplayBuilder = TextDisplayBuilderClass;
