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

