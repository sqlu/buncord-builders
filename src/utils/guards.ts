import { ComponentType } from '../enums.ts';

/**
 * Builds a tuple of a given length.
 * Used for compile-time length verification.
 */
type BuildTuple<L extends number, T extends unknown[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, unknown]>;

type DecimalDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type DigitValue = { '0': 0; '1': 1; '2': 2; '3': 3; '4': 4; '5': 5; '6': 6; '7': 7; '8': 8; '9': 9 };

/** Compare equal-length decimal strings one digit at a time. */
type CompareDecimalDigits<A extends string, B extends string> =
  A extends `${infer FirstA extends DecimalDigit}${infer RestA}`
  ? B extends `${infer FirstB extends DecimalDigit}${infer RestB}`
    ? FirstA extends FirstB
      ? CompareDecimalDigits<RestA, RestB>
      : BuildTuple<DigitValue[FirstA]> extends [...BuildTuple<DigitValue[FirstB]>, ...unknown[]]
        ? false
        : true
    : true
  : true;

type CompareDecimalIntegers<A extends string, B extends string> =
  StringLength<A> extends StringLength<B>
  ? CompareDecimalDigits<A, B>
  : BuildTuple<StringLength<A>> extends [...BuildTuple<StringLength<B>>, ...unknown[]]
    ? false
    : true;

/** Compare a single pair of nonnegative numeric literals. */
type CompareNumericLiteral<A extends number, B extends number> =
  A extends B
  ? true
  : `${A}` extends `-${string}`
  ? true
  : `${B}` extends `-${string}`
  ? true
  : `${A}` extends `${bigint}`
  ? `${B}` extends `${bigint}`
    ? CompareDecimalIntegers<`${A}`, `${B}`>
    : true
  : true;

/** Distribute both bounds to check every possible pairing of literal unions. */
type CompareNumericUnions<A extends number, B extends number> =
  A extends unknown ? B extends unknown ? CompareNumericLiteral<A, B> : never : never;

/**
 * Checks nonnegative integer bounds by decimal digits, avoiding tuple recursion
 * proportional to the bound. Dynamic and unsupported numeric forms defer to
 * runtime validation.
 */
export type IsLessThanOrEqual<A extends number, B extends number> =
  [A] extends [never]
  ? true
  : [B] extends [never]
  ? true
  : number extends A
  ? true
  : number extends B
  ? true
  : false extends CompareNumericUnions<A, B>
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
 * Bounds that are too large to verify at the type level.
 *
 * {@link StringLength} counts characters by building a tuple one element at a
 * time, so checking a bound in the thousands blows past the TypeScript
 * instantiation depth limit. These bounds are enforced at runtime instead.
 */
type UncheckableLengthBound = 512 | 1024 | 2048 | 4000;

/**
 * Validates that a string literal does not exceed a maximum length.
 * Returns the string if valid, or an error type otherwise.
 */
export type CheckMaxLength<
  S extends string,
  Max extends number,
  Name extends string = 'String',
> =
  [S] extends [never]
  ? never
  : string extends S
  ? S
  : Max extends UncheckableLengthBound
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
  [S] extends [never]
  ? never
  : string extends S
  ? S
  : Min extends UncheckableLengthBound
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
  : A extends readonly [...BuildTuple<Min>, ...unknown[]]
  ? IsLessThanOrEqual<A['length'], Max> extends true
  ? A
  : { readonly error: `${Name} size exceeds maximum of ${Max} elements` }
  : { readonly error: `${Name} must have at least ${Min} elements` };

/**
 * Validates that a string URL uses a scheme Discord accepts on link buttons.
 */
export type CheckUrl<Url extends string> =
  [Url] extends [never]
  ? never
  : string extends Url
  ? Url
  : Url extends `http://${string}` | `https://${string}` | `discord://${string}`
  ? Url
  : { readonly error: 'URL must start with http://, https://, or discord://' };

/**
 * Validates that a string URL starts with http://, https://, or attachment://.
 */
export type CheckMediaUrl<Url extends string> =
  [Url] extends [never]
  ? never
  : string extends Url
  ? Url
  : Url extends `http://${string}` | `https://${string}` | `attachment://${string}`
  ? Url
  : { readonly error: 'URL must start with http://, https://, or attachment://' };

/**
 * Validates that a string URL starts with attachment://.
 */
export type CheckAttachmentUrl<Url extends string> =
  [Url] extends [never]
  ? never
  : string extends Url
  ? Url
  : Url extends `attachment://${string}`
  ? Url
  : { readonly error: 'URL must start with attachment://' };

/**
 * Valid range of values for select menus (0-25).
 */
export type AllowedSelectMenuRange =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25;

/**
 * Valid range of values for file uploads (0-10).
 */
export type FileUploadRange =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Requires exactly one of customId or custom_id to be present.
 */
export type WithId<CustomId extends string = string> =
  | {
    customId: CustomId & CheckMinLength<CustomId, 1, 'customId'> & CheckMaxLength<CustomId, 100, 'customId'>;
    custom_id?: never;
  }
  | {
    custom_id: CustomId & CheckMinLength<CustomId, 1, 'custom_id'> & CheckMaxLength<CustomId, 100, 'custom_id'>;
    customId?: never;
  };


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


/**
 * Scans the component tree and grabs any customId matching the target type.
 * @template C The component or structure to scan.
 * @template Type The component type to target.
 */
export type ExtractCustomIdsByType<C, Type extends ComponentType> =
  | (C extends { readonly customId: infer Id; readonly type: Type } ? (Id extends string ? Id : never) : never)
  | (C extends { readonly component: infer Comp } ? ExtractCustomIdsByType<Comp, Type> : never)
  | (C extends { readonly components: infer Comps }
    ? Comps extends readonly unknown[]
    ? ExtractCustomIdsByType<Comps[number], Type>
    : never
    : never)
  | (C extends { readonly accessory: infer Acc } ? ExtractCustomIdsByType<Acc, Type> : never);

/**
 * Scans the component tree and pulls out every single customId it finds.
 * @template C The component or structure to scan.
 */
export type ExtractAllCustomIds<C> =
  | (C extends { readonly customId: infer Id } ? (Id extends string ? Id : never) : never)
  | (C extends { readonly component: infer Comp } ? ExtractAllCustomIds<Comp> : never)
  | (C extends { readonly components: infer Comps }
    ? Comps extends readonly unknown[]
    ? ExtractAllCustomIds<Comps[number]>
    : never
    : never)
  | (C extends { readonly accessory: infer Acc } ? ExtractAllCustomIds<Acc> : never);

/**
 * Extracts custom IDs for buttons from a component structure.
 * @template C The component or structure type.
 */
export type ExtractButtonIds<C> = ExtractCustomIdsByType<C, ComponentType.Button>;

/**
 * Extracts custom IDs for select menus from a component structure.
 * @template C The component or structure type.
 */
export type ExtractSelectMenuIds<C> = ExtractCustomIdsByType<C,
  | ComponentType.StringSelect
  | ComponentType.UserSelect
  | ComponentType.RoleSelect
  | ComponentType.MentionableSelect
  | ComponentType.ChannelSelect
>;

/**
 * Pulls customIds from all text inputs in the layout.
 * @template C The component or structure.
 */
export type ExtractTextInputIds<C> = ExtractCustomIdsByType<C, ComponentType.TextInput>;

/**
 * Extracts custom IDs for checkboxes from a component structure.
 * @template C The component or structure type.
 */
export type ExtractCheckboxIds<C> = ExtractCustomIdsByType<C, ComponentType.Checkbox>;

/**
 * Pulls customIds from all checkboxes in the layout.
 * @template C The component or structure.
 */
export type ExtractCheckboxGroupIds<C> = ExtractCustomIdsByType<C, ComponentType.CheckboxGroup>;

/**
 * Extracts custom IDs for radio groups from a component structure.
 * @template C The component or structure type.
 */
export type ExtractRadioGroupIds<C> = ExtractCustomIdsByType<C, ComponentType.RadioGroup>;

/**
 * Extracts custom IDs for file uploads from a component structure.
 * @template C The component or structure type.
 */
export type ExtractFileUploadIds<C> = ExtractCustomIdsByType<C, ComponentType.FileUpload>;

/**
 * Checks that the options have either customId or custom_id, but not both.
 * @template Opts The user configuration options.
 * @template Name The component name for error messages.
 */
export type ValidateIdentity<Opts, Name extends string = 'Component'> =
  [Opts] extends [never]
  ? unknown
  : Opts extends { customId: string } | { custom_id: string }
  ? (Opts extends { customId: string; custom_id: string }
    ? { readonly error: `Cannot specify both customId and custom_id on ${Name}` }
    : unknown)
  : { readonly error: `${Name} requires a customId or custom_id property` };

/**
 * Extracts the custom identifier string literal from an options object.
 * @template Opts The configuration options.
 */
export type ExtractCustomId<Opts> =
  Opts extends { customId: infer Cid }
  ? (Cid extends string ? Cid : string)
  : Opts extends { custom_id: infer Cid }
  ? (Cid extends string ? Cid : string)
  : string;

/**
 * Extracts the label string literal value.
 * @template Opts The configuration options.
 */
export type GetLabel<Opts> = Opts extends { label: infer L } ? (L extends string ? L : never) : never;

/**
 * Extracts the URL string literal value.
 * @template Opts The configuration options.
 */
export type GetUrl<Opts> = Opts extends { url: infer U } ? (U extends string ? U : never) : never;

/**
 * Extracts the custom ID field value type from an options object.
 * @template Opts The configuration options.
 */
export type GetCustomIdField<Opts> =
  Opts extends { customId: infer C }
  ? (C extends string ? C : never)
  : Opts extends { custom_id: infer C }
  ? (C extends string ? C : never)
  : never;

/**
 * Compile-time check to verify string length bounds (min/max).
 * @template Val The target string type.
 * @template Min The minimum length required.
 * @template Max The maximum length allowed.
 * @template Name The field name for errors.
 */
export type CheckStringConstraints<Val, Min extends number, Max extends number, Name extends string> =
  [Val] extends [never]
  ? unknown
  : CheckMinLength<Val & string, Min, Name> extends { readonly error: string }
  ? CheckMinLength<Val & string, Min, Name>
  : CheckMaxLength<Val & string, Max, Name> extends { readonly error: string }
  ? CheckMaxLength<Val & string, Max, Name>
  : unknown;

/**
 * Compile-time check to verify URL format and length bounds.
 * @template Val The target URL string type.
 * @template Max The maximum length allowed.
 * @template Name The field name for errors.
 */
export type CheckUrlConstraints<Val, Max extends number, Name extends string> =
  [Val] extends [never]
  ? unknown
  : CheckUrl<Val & string> extends { readonly error: string }
  ? CheckUrl<Val & string>
  : CheckMaxLength<Val & string, Max, Name> extends { readonly error: string }
  ? CheckMaxLength<Val & string, Max, Name>
  : unknown;

/**
 * Validates that minValues is only 0 when the menu isn't required.
 * @template Opts The configuration options.
 */
export type ValidateSelectMenuRequired<Opts> =
  Opts extends { minValues: 0 } | { min_values: 0 }
  ? Opts extends { required: false }
  ? unknown
  : { readonly error: 'minValues can only be 0 if required is false' }
  : unknown;

