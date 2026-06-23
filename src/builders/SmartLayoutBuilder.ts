import { ComponentType } from '../enums.ts';
import { ActionRowBuilder, type ActionRowComponent } from './ActionRowBuilder.ts';
import type { ButtonBuilder } from './ButtonBuilder.ts';
import type {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
} from './SelectMenuBuilders.ts';

/**
 * Represents any valid select menu builder type.
 */
type AnySelectMenu =
  | StringSelectMenuBuilder
  | UserSelectMenuBuilder
  | RoleSelectMenuBuilder
  | MentionableSelectMenuBuilder
  | ChannelSelectMenuBuilder;

/**
 * Valid components that can be laid out by the SmartLayoutBuilder.
 */
type LayoutComponent = ButtonBuilder | AnySelectMenu;

const SELECT_TYPES = new Set<ComponentType>([
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
]);

/**
 * Utility helper to automatically lay out buttons and select menus into valid `ActionRow`s.
 *
 * **Rules:**
 * - Buttons pack sequentially into `ActionRow`s, up to 5 per row.
 * - Select menus always get their own dedicated `ActionRow`.
 * - Throws if the result would exceed the Discord limit of 5 `ActionRow`s per message.
 *
 * @example
 * ```ts
 * const rows = new SmartLayoutBuilder()
 *   .addButtons(starBtn, sponsorBtn)
 *   .addSelectMenu(discordChannelMenu)
 *   .addButtons(snayzProfileBtn)
 *   .build();
 * // -> [ActionRow[starBtn, sponsorBtn], ActionRow[discordChannelMenu], ActionRow[snayzProfileBtn]]
 * ```
 *
 * @see {@link https://discord.com/developers/docs/components/reference#action-row Discord Docs - Action Row}
 */
export class SmartLayoutBuilder {
  private readonly components: LayoutComponent[] = [];
  private _pendingRow: LayoutComponent[] = [];
  private _rows: ActionRowBuilder[] = [];

  constructor() {}

  /**
   * Adds one or more buttons to the layout queue.
   * @param buttons Buttons to add
   * @returns The layout builder instance
   */
  addButtons(...buttons: ButtonBuilder[]): this {
    this.components.push(...buttons);
    return this;
  }

  /**
   * Adds a select menu to the layout queue (takes up a dedicated row).
   * @param menu Select menu to add
   * @returns The layout builder instance
   */
  addSelectMenu(menu: AnySelectMenu): this {
    this.components.push(menu);
    return this;
  }

  private _flush(): void {
    if (this._pendingRow.length > 0) {
      this._rows.push(
        new ActionRowBuilder({
          components: this._pendingRow as unknown as ActionRowComponent[],
        }),
      );
      this._pendingRow = [];
    }
  }

  /**
   * Organizes the added components into an array of ActionRowBuilders.
   * @returns The array of configured ActionRowBuilders
   * @throws If more than 5 ActionRows would be generated
   */
  build(): ActionRowBuilder[] {
    this._rows = [];
    this._pendingRow = [];

    const total = this.components.length;
    for (let i = 0; i < total; i++) {
      const comp = this.components[i]!;
      const isSelect = SELECT_TYPES.has((comp as { type: number }).type);

      if (isSelect) {
        this._flush();
        this._rows.push(
          new ActionRowBuilder({
            components: [comp] as unknown as ActionRowComponent[],
          }),
        );
      } else {
        if (this._pendingRow.length >= 5) this._flush();
        this._pendingRow.push(comp);
      }
    }

    this._flush();

    if (this._rows.length > 5)
      throw new Error(
        `too many action rows, got ${this._rows.length} but discord allows a maximum of 5`,
      );

    return this._rows;
  }
}
