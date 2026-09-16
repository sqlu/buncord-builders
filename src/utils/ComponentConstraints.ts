import { ComponentType } from '../enums.ts';

/**
 * Maximum number of components Discord accepts in a single message payload.
 * @see {@link https://docs.discord.com/developers/components/reference}
 */
export const MAX_TREE_COMPONENTS = 40;

export const MAX_TREE_TEXT_LENGTH = 4000;
export const MAX_COMPONENT_ID = 0xffffffff;

/** Text fields that count toward {@link MAX_TREE_TEXT_LENGTH}. */
export const AUDIT_TEXT_FIELDS = ['content', 'label', 'description', 'placeholder', 'value', 'title'] as const;

/** Component types that behave like a select menu. */
export const SELECT_MENU_TYPES = new Set<number>([
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
]);

export const INPUT_TYPES = new Set<number>([
  ComponentType.TextInput, ComponentType.FileUpload, ComponentType.RadioGroup,
  ComponentType.CheckboxGroup, ComponentType.Checkbox,
]);

/** Component types a Label is allowed to wrap inside a modal. */
export const LABEL_CHILD_TYPES: ReadonlySet<number> = new Set<number>([
  ...SELECT_MENU_TYPES,
  ComponentType.TextInput,
  ComponentType.Checkbox,
  ComponentType.CheckboxGroup,
  ComponentType.RadioGroup,
  ComponentType.FileUpload,
]);

export interface IntegerFieldConstraint {
  field: string;
  alias?: string;
  minimum: number;
  maximum: number;
  nullable?: boolean;
}

export const SELECT_INTEGER_FIELDS: readonly IntegerFieldConstraint[] = [
  { field: 'min_values', alias: 'minValues', minimum: 0, maximum: 25 },
  { field: 'max_values', alias: 'maxValues', minimum: 1, maximum: 25 },
];

export const COMPONENT_INTEGER_FIELDS: Partial<Record<ComponentType, readonly IntegerFieldConstraint[]>> = {
  [ComponentType.Button]: [{ field: 'style', minimum: 1, maximum: 6 }],
  [ComponentType.TextInput]: [
    { field: 'style', minimum: 1, maximum: 2 },
    { field: 'min_length', alias: 'minLength', minimum: 0, maximum: 4000 },
    { field: 'max_length', alias: 'maxLength', minimum: 1, maximum: 4000 },
  ],
  [ComponentType.FileUpload]: [
    { field: 'min_values', alias: 'minValues', minimum: 0, maximum: 10 },
    { field: 'max_values', alias: 'maxValues', minimum: 1, maximum: 10 },
  ],
  [ComponentType.CheckboxGroup]: [
    { field: 'min_values', alias: 'minValues', minimum: 0, maximum: 10 },
    { field: 'max_values', alias: 'maxValues', minimum: 1, maximum: 10 },
  ],
  [ComponentType.Separator]: [{ field: 'spacing', minimum: 1, maximum: 2 }],
  [ComponentType.Container]: [{ field: 'accent_color', alias: 'accentColor', minimum: 0, maximum: 0xffffff, nullable: true }],
};

/**
 * Component types a Container is allowed to hold.
 * @see {@link https://docs.discord.com/developers/components/reference#container}
 */
export const CONTAINER_CHILD_TYPES: ReadonlySet<number> = new Set<number>([
  ComponentType.ActionRow,
  ComponentType.TextDisplay,
  ComponentType.Section,
  ComponentType.MediaGallery,
  ComponentType.Separator,
  ComponentType.File,
]);

/** Default value types accepted by each auto-populated select menu. */
export const SELECT_DEFAULT_VALUE_TYPES = new Map<number, readonly string[]>([
  [ComponentType.UserSelect, ['user']],
  [ComponentType.RoleSelect, ['role']],
  [ComponentType.MentionableSelect, ['user', 'role']],
  [ComponentType.ChannelSelect, ['channel']],
]);


/**
 * How a rule that deviates from the primary reference was checked.
 *
 * - `sources-disagree`: the official reference and a secondary source state
 *   different limits, and this library had to pick one.
 * - `unverified`: this library enforces the rule without a source that states
 *   it, and without a reproducible live API check.
 */
export type RuleVerification = 'sources-disagree' | 'unverified';

/**
 * A rule this library enforces that the primary reference does not settle.
 *
 * These are the only rules a documentation diff cannot re-verify on its own,
 * so each one names how it was checked and needs a human to revisit it.
 */
export interface SpecException {
  /** Stable identifier, used to pin a regression test to this entry. */
  readonly code: string;
  /** What this library enforces. */
  readonly rule: string;
  /** How the rule was checked. */
  readonly verification: RuleVerification;
  /** Why it is enforced anyway, and what would settle it. */
  readonly rationale: string;
}

/**
 * Where the constraints in this module come from, and when they were last
 * checked against the references by a human.
 *
 * This is deliberately a date and a source list rather than a version number:
 * Discord does not version its component specification, so any version printed
 * here would describe our own reading and imply an authority that does not
 * exist. A date and a source list can be checked.
 *
 * Re-verify by re-reading {@link SPEC_PROVENANCE.primaryReference} against this
 * module, then bump {@link SPEC_PROVENANCE.verifiedOn}.
 */
export const SPEC_PROVENANCE = {
  /** ISO date of the last manual verification against the references. */
  verifiedOn: '2026-09-16',

  /**
   * The authoritative source. Where it disagrees with any other source, this
   * one wins unless an entry in {@link SPEC_PROVENANCE.exceptions} says why not.
   */
  primaryReference: 'https://docs.discord.com/developers/components/reference',

  /** Secondary sources consulted, which are community maintained. */
  secondaryReferences: [
    'https://docs.discord.food/resources/components',
  ],

  /**
   * Rules the primary reference does not settle.
   * Every entry is pinned by a test, so the list cannot drift into fiction.
   */
  exceptions: [
    {
      code: 'LINK_BUTTON_URL_SCHEME',
      rule: 'Link buttons accept discord:// in addition to http and https.',
      verification: 'unverified',
      rationale:
        'The reference only says "URL for link-style buttons" and never enumerates the allowed schemes; the string "discord://" does not appear on the page at all. This library accepts it, which is permissive rather than restrictive, so it cannot reject a payload Discord would have taken. Settling it needs a live API check.',
    },
  ] as const satisfies readonly SpecException[],
} as const;
