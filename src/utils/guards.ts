import { ComponentType } from '../enums.ts';

/**
 * Builds a tuple of a given length.
 * Used for compile-time length verification.
 */
type BuildTuple<L extends number, T extends unknown[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, unknown]>;

/**
 * Checks whether A is less than or equal to B at the type level.
 * Works for small positive integers.
 */
export type IsLessThanOrEqual<A extends number, B extends number> =
  A extends B
  ? true
  : BuildTuple<A> extends [...BuildTuple<B>, ...unknown[]]
  ? false
  : true;

/**
 * Computes the length of a string literal.
 */
export type StringLength<S extends string, Acc extends unknown[] = []> =
  S extends `${string}${infer Rest}`
  ? StringLength<Rest, [...Acc, unknown]>
  : Acc['length'];

/**
 * Validates that a string literal does not exceed a maximum length.
 * Returns the string if valid, or an error type otherwise.
 */
export type CheckMaxLength<
  S extends string,
  Max extends number,
  Name extends string = 'String',
> =
  number extends StringLength<S>
  ? S
  : IsLessThanOrEqual<StringLength<S>, Max> extends true
  ? S
  : { readonly error: `${Name} length exceeds maximum of ${Max} characters` };

/**
 * Validates that a string literal is at least a minimum length.
 * Returns the string if valid, or an error type otherwise.
 */
export type CheckMinLength<
  S extends string,
  Min extends number,
  Name extends string = 'String',
> =
  number extends StringLength<S>
  ? S
  : IsLessThanOrEqual<Min, StringLength<S>> extends true
  ? S
  : { readonly error: `${Name} must have at least ${Min} characters` };

/**
 * Validates an array length between Min and Max inclusive.
 * Returns the array if valid, or an error type otherwise.
 */
export type CheckArrayLength<
  A extends readonly unknown[],
  Min extends number,
  Max extends number,
  Name extends string = 'Array',
> =
  number extends A['length']
  ? A
  : A extends [...BuildTuple<Min>, ...unknown[]]
  ? IsLessThanOrEqual<A['length'], Max> extends true
  ? A
  : { readonly error: `${Name} size exceeds maximum of ${Max} elements` }
  : { readonly error: `${Name} must have at least ${Min} elements` };

/**
 * Requires at least one of the specified object keys.
 */
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

/**
 * Represents an object with either customId or custom_id.
 */
type Identity<CustomId extends string = string> = {
  customId: CustomId & CheckMaxLength<CustomId, 100, 'customId'>;
  custom_id: CustomId & CheckMaxLength<CustomId, 100, 'custom_id'>;
};

/**
 * Requires exactly one of customId or custom_id to be present.
 */
export type WithId<CustomId extends string = string> =
  RequireAtLeastOne<Identity<CustomId>, 'customId' | 'custom_id'>;

/**
 * Determines if a component is a button.
 */
type IsButtonType<T> = T extends { type: ComponentType.Button } ? true : false;

/**
 * Determines if a component is a select menu.
 */
type IsSelectMenuType<T> = T extends { type: ComponentType.StringSelect | ComponentType.UserSelect | ComponentType.RoleSelect | ComponentType.MentionableSelect | ComponentType.ChannelSelect } ? true : false;

/**
 * Determines if a component is a text input.
 */
type IsTextInputType<T> = T extends { type: ComponentType.TextInput } ? true : false;

/**
 * Checks whether all elements in a tuple are buttons.
 */
type CheckAllButtons<T extends readonly unknown[]> =
  T extends readonly [infer Head, ...infer Tail]
  ? IsButtonType<Head> extends true
  ? CheckAllButtons<Tail>
  : false
  : true;

/**
 * Checks whether all elements in a tuple are select menus.
 */
type CheckAllSelectMenus<T extends readonly unknown[]> =
  T extends readonly [infer Head, ...infer Tail]
  ? IsSelectMenuType<Head> extends true
  ? CheckAllSelectMenus<Tail>
  : false
  : true;

/**
 * Checks whether all elements in a tuple are text inputs.
 */
type CheckAllTextInputs<T extends readonly unknown[]> =
  T extends readonly [infer Head, ...infer Tail]
  ? IsTextInputType<Head> extends true
  ? CheckAllTextInputs<Tail>
  : false
  : true;

/**
 * Validates the components of an ActionRow.
 * Allows only buttons, a single select menu, or a single text input.
 */
export type ValidActionRowComponents<C extends readonly unknown[]> =
  number extends C['length']
  ? C
  : C['length'] extends 0
  ? C
  : CheckAllButtons<C> extends true
  ? C['length'] extends 1 | 2 | 3 | 4 | 5
  ? C
  : { readonly error: 'An ActionRow with buttons can have at most 5 buttons' }
  : CheckAllSelectMenus<C> extends true
  ? C['length'] extends 1
  ? C
  : { readonly error: 'An ActionRow can only contain exactly 1 Select Menu' }
  : CheckAllTextInputs<C> extends true
  ? C['length'] extends 1
  ? C
  : { readonly error: 'An ActionRow can only contain exactly 1 TextInput' }
  : { readonly error: 'ActionRow components cannot be mixed: buttons, select menus, and text inputs must be in separate rows' };
