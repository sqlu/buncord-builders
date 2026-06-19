import { ComponentType } from '../enums.ts';
import type { APIActionRowComponent, APIComponent, APIMessageComponent, APITextInputComponent } from '../types.ts';
import type { CheckArrayLength, ValidActionRowComponents } from '../utils/guards.ts';
import { BaseComponent, resolveRaw } from './base.ts';

export type ActionRowComponent = {
  type: number;
  toJSON(): APIMessageComponent | APITextInputComponent;
};

export interface ActionRowOptions<
  T extends ActionRowComponent = ActionRowComponent,
  Components extends readonly T[] = T[],
> {
  components?: Components & ValidActionRowComponents<Components>;
}

export interface ActionRowBuilderInstance<
  T extends ActionRowComponent = ActionRowComponent,
  Components extends readonly T[] = readonly T[],
> extends ActionRowBuilderClass<T, Components> {
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
    const comps = opts?.components ?? [];
    const len = comps.length;
    if (len > 5) throw new Error("components size can't exceed 5");
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
    const len = components.length;
    if (len > 5)
      throw new Error("components size can't exceed 5");
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
    if (!this.data.components) this.data.components = [];
    const currentLen = this.data.components.length;
    const addedLen = components.length;
    if (currentLen + addedLen > 5)
      throw new Error("components size can't exceed 5");
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
   * @see {@link https://discord.com/developers/docs/interactions/message-components#action-row-object}
   */
  override toJSON(): APIActionRowComponent<ReturnType<T['toJSON']>> {
    const comps = this.data.components;
    const len = comps ? comps.length : 0;
    if (len === 0) {
      throw new Error('need at least one component to serialize');
    }
    const serialized = new Array(len);
    for (let i = 0; i < len; i++) {
      const c = comps![i] as unknown as ActionRowComponent;
      serialized[i] = c?.toJSON ? c.toJSON() : c;
    }
    if (this.id !== undefined) {
      (this.data as Record<string, unknown>).id = this.id;
    }
    return {
      ...this.data,
      components: serialized,
    } as APIActionRowComponent<ReturnType<T['toJSON']>>;
  }
}

/**
 * Re-exports ActionRowBuilder with its static .from() method and fluent interface.
 * 
 * @see {@link https://discord.com/developers/docs/interactions/message-components#action-rows}
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

export type ActionRowBuilder<
  T extends ActionRowComponent = ActionRowComponent,
> = ActionRowBuilderClass<T, readonly T[]>;
