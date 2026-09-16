import { componentValidationError } from '../utils/ComponentError.ts';
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

const MAX_BUTTONS_PER_ROW = 5;
const MAX_ROWS = 5;
const MAX_V2_COMPONENTS = 40;

/** Discord message format used to validate the generated layout. */
export interface SmartLayoutOptions {
  /** Legacy messages allow 5 rows; Components V2 allows 40 total components, including rows. */
  mode?: 'legacy' | 'componentsV2';
}

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
 * - Legacy mode permits at most 5 rows (the default).
 * - Components V2 mode permits at most 40 components, including generated rows.
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
 * @see {@link https://docs.discord.com/developers/components/reference#action-row Discord Docs - Action Row}
 */
export class SmartLayoutBuilder {
  private readonly components: LayoutComponent[] = [];
  private readonly mode: 'legacy' | 'componentsV2';

  /** Creates an empty layout queue. */
  constructor(options: SmartLayoutOptions = {}) {
    const mode = options.mode ?? 'legacy';
    if (mode !== 'legacy' && mode !== 'componentsV2') throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `invalid layout mode ${mode}`);
    this.mode = mode;
  }

  /** Validate both existing and prospective entries before allocating rows or changing the queue. */
  private validateComponents(additions: readonly LayoutComponent[] = []): void {
    const count = this.components.length + additions.length;
    if (this.mode === 'legacy' && count > MAX_ROWS * MAX_BUTTONS_PER_ROW) {
      throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `too many action rows, discord allows a maximum of ${MAX_ROWS}`);
    }
    if (this.mode === 'componentsV2' && count >= MAX_V2_COMPONENTS) {
      throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `too many components, discord limit is ${MAX_V2_COMPONENTS} including action rows`);
    }
    let rows = 0;
    let pendingButtons = 0;
    for (let i = 0; i < count; i++) {
      const component = i < this.components.length ? this.components[i] : additions[i - this.components.length];
      const type = component?.type;
      if (type === ComponentType.Button) {
        if (pendingButtons === 0 || pendingButtons === MAX_BUTTONS_PER_ROW) {
          rows++;
          pendingButtons = 0;
        }
        pendingButtons++;
      } else if (SELECT_TYPES.has(type as ComponentType)) {
        rows++;
        pendingButtons = 0;
      } else {
        throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `invalid layout component type ${type}`);
      }
      if (this.mode === 'legacy' && rows > MAX_ROWS) {
        throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `too many action rows, got ${rows} but discord allows a maximum of ${MAX_ROWS}`);
      }
      if (this.mode === 'componentsV2' && count + rows > MAX_V2_COMPONENTS) {
        throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', `too many components, discord limit is ${MAX_V2_COMPONENTS} including action rows`);
      }
    }
  }

  /**
   * Adds one or more buttons to the layout queue.
   * @param buttons - Buttons to add.
   * @returns The layout builder instance.
   */
  addButtons(...buttons: ButtonBuilder[]): this {
    this.validateComponents(buttons);
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i]?.type !== ComponentType.Button) throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', 'addButtons requires Button components');
    }
    for (let i = 0; i < buttons.length; i++) this.components.push(buttons[i]!);
    return this;
  }

  /**
   * Adds a select menu to the layout queue (it takes up a dedicated row).
   * @param menu - Select menu to add.
   * @returns The layout builder instance.
   */
  addSelectMenu(menu: AnySelectMenu): this {
    if (!SELECT_TYPES.has(menu?.type)) throw componentValidationError('SMART_LAYOUT_VALIDATION_FAILED', 'addSelectMenu requires a select menu component');
    this.validateComponents([menu]);
    this.components.push(menu);
    return this;
  }

  /**
   * Organizes the queued components into valid ActionRows.
   *
   * @returns The generated rows, in insertion order.
   * @throws If the queued components exceed the selected message format's limits.
   */
  build(): ActionRowBuilder[] {
    this.validateComponents();
    const rows: ActionRowBuilder[] = [];
    let pending: LayoutComponent[] | null = null;

    for (let i = 0; i < this.components.length; i++) {
      const component = this.components[i]!;

      if (SELECT_TYPES.has((component as { type: number }).type)) {
        // A select menu always takes a row of its own, so close the pending one.
        if (pending) {
          rows.push(new ActionRowBuilder({ components: pending as unknown as ActionRowComponent[] }));
          pending = null;
        }
        rows.push(new ActionRowBuilder({ components: [component] as unknown as ActionRowComponent[] }));
        continue;
      }

      if (pending && pending.length >= MAX_BUTTONS_PER_ROW) {
        rows.push(new ActionRowBuilder({ components: pending as unknown as ActionRowComponent[] }));
        pending = null;
      }
      if (pending) pending.push(component);
      else pending = [component];
    }

    if (pending) {
      rows.push(new ActionRowBuilder({ components: pending as unknown as ActionRowComponent[] }));
    }

    return rows;
  }
}
