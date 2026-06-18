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

type AnySelectMenu =
  | StringSelectMenuBuilder
  | UserSelectMenuBuilder
  | RoleSelectMenuBuilder
  | MentionableSelectMenuBuilder
  | ChannelSelectMenuBuilder;

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

  /**
   * Organizes the added components into an array of ActionRowBuilders.
   * @returns The array of configured ActionRowBuilders
   * @throws If more than 5 ActionRows would be generated
   */
  build(): ActionRowBuilder[] {
    const rows: ActionRowBuilder[] = [];
    let currentRow: LayoutComponent[] = [];

    const flush = () => {
      if (currentRow.length > 0) {
        rows.push(
          new ActionRowBuilder({
            components: currentRow as unknown as ActionRowComponent[],
          }),
        );
        currentRow = [];
      }
    };

    for (const comp of this.components) {
      const isSelect = SELECT_TYPES.has((comp as { type: number }).type);

      if (isSelect) {
        flush();
        rows.push(
          new ActionRowBuilder({
            components: [comp] as unknown as ActionRowComponent[],
          }),
        );
      } else {
        if (currentRow.length >= 5) flush();
        currentRow.push(comp);
      }
    }

    flush();

    if (rows.length > 5)
      throw new Error(
        `too many action rows, got ${rows.length} but discord allows a maximum of 5`,
      );

    return rows;
  }
}
