import { componentValidationError } from '../utils/ComponentError.ts';
import { ComponentType } from '../enums.ts';
import type { APIActionRowComponent, APIComponent, APIMessageComponent, APITextInputComponent } from '../types.ts';
import type { ValidActionRowComponents } from '../utils/guards.ts';
import { BaseComponent, resolveRaw, serializeEntries } from './base.ts';

/** Maximum number of components a single action row can hold. */
const MAX_COMPONENTS = 5;

/** Check a row before storing or serializing its children. */
function assertActionRowComponents(
  components: readonly unknown[],
  additions: readonly unknown[] = [],
): void {
  const length = components.length + additions.length;
  if (length > MAX_COMPONENTS) throw componentValidationError('ACTION_ROW_VALIDATION_FAILED', `components size can't exceed ${MAX_COMPONENTS}`);
  for (let i = 0; i < length; i++) {
    const component = i < components.length ? components[i] : additions[i - components.length];
    const type = (component as { type?: number } | null)?.type;
    if (type === ComponentType.Button) continue;
    if (type !== ComponentType.TextInput && type !== ComponentType.StringSelect &&
        type !== ComponentType.UserSelect && type !== ComponentType.RoleSelect &&
        type !== ComponentType.MentionableSelect && type !== ComponentType.ChannelSelect) {
      throw componentValidationError('ACTION_ROW_VALIDATION_FAILED', `invalid ActionRow component type ${type}`);
    }
    if (length !== 1) throw componentValidationError('ACTION_ROW_VALIDATION_FAILED', 'ActionRow must contain up to 5 buttons or a single select menu or TextInput');
  }
}

/**
 * Valid components for Action Rows.
 */
export type ActionRowComponent = {
  /** Discord component type. */
  type: number;
  /** Convert to raw Discord API payload. */
  toJSON(): APIMessageComponent | APITextInputComponent;
};

/**
 * Config options for a new ActionRowBuilder.
 * @template T The component type.
 * @template Components The tuple type of components.
 */
export interface ActionRowOptions<
  T extends ActionRowComponent = ActionRowComponent,
  Components extends readonly T[] = T[],
> {
  /** Children components in this row. */
  components?: Components & ValidActionRowComponents<Components>;
}

/**
 * Interface for a fully configured ActionRowBuilder.
 * @template T The component type.
 * @template Components The components tuple.
 */
export interface ActionRowBuilderInstance<
  T extends ActionRowComponent = ActionRowComponent,
  Components extends readonly T[] = readonly T[],
> extends ActionRowBuilderClass<T, Components> {
  /** Children components inside this row. */
  readonly components: Components;
}

/**
 * Represents an Action Row component.
 * Can contain up to 5 interactive components horizontally (e.g. Buttons, Select Menus, Text Inputs).
 * 
 * @example
 * ```ts
 * const row = new ActionRowBuilder()
 *   .addComponents(
 *     new ButtonBuilder({
 *       customId: 'click_me',
 *       label: 'Click Me',
 *       style: ButtonStyle.Primary,
 *     })
 *   );
 * ```
 */
class ActionRowBuilderClass<
  T extends ActionRowComponent = ActionRowComponent,
  Components extends readonly T[] = [],
> extends BaseComponent<Partial<APIActionRowComponent<APIMessageComponent | APITextInputComponent>>> {
  public override readonly type = ComponentType.ActionRow;

  /**
   * Recreates an ActionRowBuilder from a raw API payload.
   * @param data Raw action row payload
   * @returns A new ActionRowBuilderClass instance
   */
  public static from(data: APIActionRowComponent<APIMessageComponent | APITextInputComponent>): ActionRowBuilderClass<ActionRowComponent, readonly ActionRowComponent[]> {
    const raw = resolveRaw(data) as unknown as APIActionRowComponent<APIMessageComponent | APITextInputComponent>;
    const rawComps = raw.components ?? [];
    assertActionRowComponents(rawComps);
    const len = rawComps.length;
    const comps = new Array(len);
    for (let i = 0; i < len; i++) {
      comps[i] = BaseComponent.resolve!(rawComps[i] as APIComponent) as ActionRowComponent;
    }
    const builder = new ActionRowBuilderClass<ActionRowComponent, readonly ActionRowComponent[]>({
      components: comps,
    });
    if (raw.id !== undefined) builder.setId(raw.id);
    return builder;
  }

  /**
   * Gets the child components in this action row.
   * @readonly
   */
  public get components(): readonly T[] {
    return (this.data.components ?? []) as unknown as readonly T[];
  }

  constructor(opts?: ActionRowOptions<T, Components>) {
    if (!opts) {
      super({
        type: ComponentType.ActionRow,
        components: [],
      });
      return;
    }
    const comps = opts.components ?? [];
    assertActionRowComponents(comps);
    super({
      type: ComponentType.ActionRow,
      components: comps as unknown as (APIMessageComponent | APITextInputComponent)[],
    });
  }

  /**
   * Replaces all components in this action row.
   * @param components New components to set
   * @returns A new ActionRowBuilderClass with updated components
   * @throws If component count exceeds 5
   */
  setComponents<const NewComponents extends readonly T[]>(
    components: NewComponents & ValidActionRowComponents<NewComponents>,
  ): ActionRowBuilderClass<T, NewComponents> {
    assertActionRowComponents(components);
    this.data.components = components as unknown as (APIMessageComponent | APITextInputComponent)[];
    return this as unknown as ActionRowBuilderClass<T, NewComponents>;
  }

  /**
   * Appends components to the action row.
   * @param components Components to add
   * @returns A new ActionRowBuilderClass with appended components
   * @throws If total components exceed 5
   */
  addComponents<const NewComponents extends readonly T[]>(
    ...components: NewComponents & ValidActionRowComponents<[...Components, ...NewComponents]>
  ): ActionRowBuilderClass<T, [...Components, ...NewComponents]> {
    assertActionRowComponents(this.data.components ?? [], components);
    if (!this.data.components) this.data.components = [];
    const addedLen = components.length;
    for (let i = 0; i < addedLen; i++) {
      this.data.components.push(components[i] as unknown as (APIMessageComponent | APITextInputComponent));
    }
    return this as unknown as ActionRowBuilderClass<T, [...Components, ...NewComponents]>;
  }

  /**
   * Converts this Action Row builder into a raw API payload structure.
   * 
   * @returns The serialized Action Row component payload.
   * @throws {Error} If components is empty or invalid.
   * 
   * @see {@link https://docs.discord.com/developers/components/reference#action-row}
   */
  override toJSON(): APIActionRowComponent<ReturnType<T['toJSON']>> {
    const comps = this.data.components;
    const len = comps ? comps.length : 0;
    if (len === 0) {
      throw componentValidationError('ACTION_ROW_VALIDATION_FAILED', 'need at least one component to serialize');
    }
    assertActionRowComponents(comps!);
    const serialized = serializeEntries(comps);
    assertActionRowComponents(serialized);
    const payload: Record<string, unknown> = {
      type: ComponentType.ActionRow,
      components: serialized,
    };
    if (this.data.id !== undefined) payload.id = this.data.id;

    return payload as unknown as APIActionRowComponent<ReturnType<T['toJSON']>>;
  }
}

/**
 * Re-exports ActionRowBuilder with its static .from() method and fluent interface.
 * 
 * @see {@link https://docs.discord.com/developers/components/reference#action-row}
 */
export const ActionRowBuilder = ActionRowBuilderClass as unknown as {
  new <
    T extends ActionRowComponent = ActionRowComponent,
    Components extends readonly T[] = [],
  >(
    opts?: ActionRowOptions<T, Components>,
  ): ActionRowBuilderInstance<T, Components>;
  from(data: APIActionRowComponent<APIMessageComponent | APITextInputComponent>): ActionRowBuilderClass<ActionRowComponent, readonly ActionRowComponent[]>;
};

/**
 * Class helper type for ActionRowBuilder.
 * @template T The components included inside the Action Row.
 */
export type ActionRowBuilder<
  T extends ActionRowComponent = ActionRowComponent,
> = ActionRowBuilderClass<T, readonly T[]>;
