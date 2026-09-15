import { ButtonStyle, ComponentType } from '../enums.ts';
import {
  MAX_TREE_COMPONENTS, MAX_TREE_TEXT_LENGTH, MAX_COMPONENT_ID, AUDIT_TEXT_FIELDS,
  SELECT_MENU_TYPES, INPUT_TYPES, SELECT_INTEGER_FIELDS, COMPONENT_INTEGER_FIELDS,
  CONTAINER_CHILD_TYPES, SELECT_DEFAULT_VALUE_TYPES,
} from './ComponentConstraints.ts';

/**
 * A single problem found by {@link BaseComponent.auditTree}.
 */
export interface AuditIssue {
  /** Whether Discord rejects the payload (`error`) or merely renders it poorly (`warning`). */
  severity: 'error' | 'warning';
  /** Human readable description of the problem. */
  message: string;
  /** Dotted path to the offending component, relative to the audited root. */
  path: string;
  /** Actionable hint describing how to resolve the problem. */
  fix: string;
  /** Stable machine readable identifier for the problem. */
  code: string;
}

/** Where the audited tree will be sent, which changes what Discord accepts. */
export type AuditContext = 'message' | 'modal';

/** Mutable state carried through a single audit run. */
interface AuditState {
  issues: AuditIssue[];
  customIds: Set<string>;
  count: number;
  textLength: number;
  ancestors: WeakSet<object>;
}

/**
 * Records an issue on the current audit run.
 */
function report(
  state: AuditState,
  severity: 'error' | 'warning',
  message: string,
  path: string,
  fix: string,
  code: string,
): void {
  state.issues.push({ severity, message, path, fix, code });
}

/** Reads a field that may be spelled in either camelCase or snake_case. */
function readAlias(payload: Record<string, unknown>, snake: string, camel: string): unknown {
  const value = payload[snake];
  return value !== undefined ? value : payload[camel];
}

/** Reads the `url` of an unfurled media item, tolerating a flattened legacy payload. */
function readMediaUrl(payload: Record<string, unknown>, field: 'media' | 'file'): unknown {
  const media = payload[field];
  if (media && typeof media === 'object') return (media as Record<string, unknown>).url;
  return payload.url;
}

/** Ignore malformed numeric data after its constraint issue has been reported. */
function readNumber(payload: Record<string, unknown>, snake: string, camel: string): number | undefined {
  const value = readAlias(payload, snake, camel);
  return typeof value === 'number' ? value : undefined;
}

function auditActionRow(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const children = payload.components;
  if (!Array.isArray(children) || children.length === 0) {
    report(
      state,
      'error',
      `ActionRow (type ${ComponentType.ActionRow}) must contain at least 1 child component`,
      path,
      'Add at least one child component to the ActionRow',
      'ACTION_ROW_EMPTY',
    );
    return;
  }

  if (children.length > 5) {
    report(
      state,
      'error',
      `ActionRow can't contain more than 5 child components (got ${children.length})`,
      path,
      'Reduce components in ActionRow to 5 or fewer',
      'ACTION_ROW_LIMIT_EXCEEDED',
    );
  }

  let hasButton = false;
  let hasSelect = false;
  let hasTextInput = false;
  let hasInvalidChild = false;
  for (let i = 0; i < children.length; i++) {
    const childType = (children[i] as { type?: number } | null)?.type;
    if (childType === ComponentType.Button) hasButton = true;
    else if (childType === ComponentType.TextInput) hasTextInput = true;
    else if (childType !== undefined && SELECT_MENU_TYPES.has(childType)) hasSelect = true;
    else hasInvalidChild = true;
  }

  if (hasInvalidChild) {
    report(
      state,
      'error',
      'ActionRow contains invalid component types (only buttons, select menus, and text inputs are allowed)',
      path,
      'Remove invalid component types from the ActionRow',
      'ACTION_ROW_INVALID_COMPONENT_TYPE',
    );
  }
  if ((hasButton && hasSelect) || (hasButton && hasTextInput) || (hasSelect && hasTextInput)) {
    report(
      state,
      'error',
      'ActionRow cannot mix buttons, select menus, and text inputs',
      path,
      'Ensure the ActionRow contains either only buttons, or a single select menu, or a single text input',
      'ACTION_ROW_MIXED_COMPONENTS',
    );
  }
  if (hasSelect && children.length > 1) {
    report(
      state,
      'error',
      `ActionRow can only contain 1 select menu, but got ${children.length}`,
      path,
      'Ensure the ActionRow contains exactly 1 select menu and no other components',
      'ACTION_ROW_MULTIPLE_SELECTS',
    );
  }
  if (hasTextInput && children.length > 1) {
    report(
      state,
      'error',
      `ActionRow can only contain 1 text input, but got ${children.length}`,
      path,
      'Ensure the ActionRow contains exactly 1 text input and no other components',
      'ACTION_ROW_MULTIPLE_TEXT_INPUTS',
    );
  }
}

function auditSection(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const children = payload.components;
  const length = Array.isArray(children) ? children.length : 0;
  if (length < 1 || length > 3) {
    report(
      state,
      'error',
      `Section must contain between 1 and 3 child components (got ${length})`,
      path,
      'Adjust Section components to be between 1 and 3',
      'SECTION_COMPONENTS_LIMIT',
    );
  }
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const childType = (children[i] as { type?: number } | null)?.type;
      if (childType !== ComponentType.TextDisplay) {
        report(
          state,
          'error',
          `Section can only contain TextDisplay components, but got type ${childType}`,
          path,
          'Only add TextDisplay components inside Section',
          'SECTION_INVALID_CHILD_TYPE',
        );
      }
    }
  }

  const accessory = payload.accessory;
  if (accessory === undefined || accessory === null) {
    report(
      state,
      'error',
      `Section must have an accessory (a Button or a Thumbnail)`,
      path,
      'Call .setAccessory() with a Button or Thumbnail component',
      'SECTION_MISSING_ACCESSORY',
    );
    return;
  }

  const accessoryType = (accessory as { type?: number }).type;
  if (accessoryType !== ComponentType.Button && accessoryType !== ComponentType.Thumbnail) {
    report(
      state,
      'error',
      `Section accessory must be a Button (type ${ComponentType.Button}) or Thumbnail (type ${ComponentType.Thumbnail}), but got type ${accessoryType}`,
      path,
      'Use a Button or Thumbnail component as the Section accessory',
      'SECTION_ACCESSORY_INVALID_TYPE',
    );
  }
}

function auditContainer(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const children = payload.components;
  const length = Array.isArray(children) ? children.length : 0;
  if (length < 1 || length > 10) {
    report(
      state,
      'error',
      `Container must contain between 1 and 10 child components (got ${length})`,
      path,
      'Add between 1 and 10 components to this container',
      'CONTAINER_COMPONENTS_LIMIT',
    );
  }
  if (!Array.isArray(children)) return;

  for (let i = 0; i < children.length; i++) {
    const childType = (children[i] as { type?: number } | null)?.type;
    if (childType === undefined || !CONTAINER_CHILD_TYPES.has(childType)) {
      report(
        state,
        'error',
        `Container child component at index ${i} has invalid type ${childType} (only ActionRow, TextDisplay, Section, MediaGallery, Separator, and File are allowed)`,
        `${path}.components[${i}]`,
        'Remove or move the invalid component out of the Container',
        'CONTAINER_CHILD_INVALID_TYPE',
      );
    }
  }
}

function auditMediaGallery(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const items = payload.items;
  const length = Array.isArray(items) ? items.length : 0;
  if (length < 1 || length > 10) {
    report(
      state,
      'error',
      `Media gallery must contain between 1 and 10 items (got ${length})`,
      path,
      'Add between 1 and 10 items to the media gallery',
      'MEDIA_GALLERY_ITEMS_LIMIT',
    );
  }
  if (!Array.isArray(items)) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as { description?: string; media?: { url?: string } } | null;
    if (!item?.media?.url) {
      report(
        state,
        'error',
        `Media gallery item at index ${i} must have a media URL`,
        `${path}.items[${i}]`,
        'Ensure the item has a valid URL',
        'MEDIA_GALLERY_ITEM_MISSING_URL',
      );
    }
    const description = item?.description;
    if (typeof description === 'string' && description.length > 1024) {
      report(
        state,
        'error',
        `Media gallery item description at index ${i} is too long (max 1024 characters, got ${description.length})`,
        `${path}.items[${i}]`,
        'Shorten the item description to 1024 characters or fewer',
        'MEDIA_GALLERY_ITEM_DESCRIPTION_TOO_LONG',
      );
    }
  }
}

function auditTextDisplay(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const content = payload.content;
  if (typeof content !== 'string') {
    report(
      state,
      'error',
      'TextDisplay content is required and must be a string',
      path,
      'Call .setContent() with a non-empty markdown string',
      'TEXT_DISPLAY_CONTENT_REQUIRED',
    );
    return;
  }
  if (content.length < 1 || content.length > MAX_TREE_TEXT_LENGTH) {
    report(
      state,
      'error',
      `TextDisplay content must be between 1 and ${MAX_TREE_TEXT_LENGTH} characters (got ${content.length})`,
      path,
      'Shorten or populate the content of this TextDisplay component',
      'TEXT_DISPLAY_CONTENT_LENGTH_INVALID',
    );
  }
}

function auditTextInput(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const min = readNumber(payload, 'min_length', 'minLength');
  const max = readNumber(payload, 'max_length', 'maxLength');

  if (min !== undefined && max !== undefined && min > max) {
    report(
      state,
      'error',
      `Text input min_length (${min}) cannot exceed max_length (${max})`,
      path,
      'Ensure min_length is less than or equal to max_length',
      'TEXT_INPUT_MIN_EXCEEDS_MAX',
    );
  }

  const value = payload.value;
  if (typeof value !== 'string') return;

  if (min !== undefined && value.length < min) {
    report(
      state,
      'error',
      `Text input value is too short, needs at least ${min} chars but got ${value.length}`,
      path,
      'Ensure text value is at least min_length',
      'TEXT_INPUT_VALUE_TOO_SHORT',
    );
  }
  if (max !== undefined && value.length > max) {
    report(
      state,
      'error',
      `Text input value is too long, max is ${max} chars but got ${value.length}`,
      path,
      'Ensure text value does not exceed max_length',
      'TEXT_INPUT_VALUE_TOO_LONG',
    );
  }
}

function auditButton(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const style = payload.style;
  const customId = readAlias(payload, 'custom_id', 'customId');

  if (style === ButtonStyle.Link) {
    if (!payload.url) {
      report(
        state,
        'error',
        `Button with style Link (${ButtonStyle.Link}) must have a url property`,
        path,
        'Call .setURL() with a valid URL on this button',
        'LINK_BUTTON_MISSING_URL',
      );
    }
    if (customId) {
      report(
        state,
        'error',
        `Button with style Link (${ButtonStyle.Link}) must not have a customId or custom_id property`,
        path,
        'Remove customId or custom_id from this Link button',
        'LINK_BUTTON_HAS_CUSTOM_ID',
      );
    }
    if (!payload.label && !payload.emoji) {
      report(
        state,
        'error',
        `Button with style Link (${ButtonStyle.Link}) must have either a label or an emoji`,
        path,
        'Add a label or emoji to this Link button',
        'LINK_BUTTON_MISSING_LABEL_OR_EMOJI',
      );
    }
  } else if (style === ButtonStyle.Premium) {
    if (!readAlias(payload, 'sku_id', 'skuId')) {
      report(
        state,
        'error',
        `Button with style Premium (${ButtonStyle.Premium}) must have a skuId or sku_id property`,
        path,
        'Call .setSKUId() with a valid SKU ID on this button',
        'PREMIUM_BUTTON_MISSING_SKU_ID',
      );
    }
    if (customId) {
      report(
        state,
        'error',
        `Button with style Premium (${ButtonStyle.Premium}) must not have a customId or custom_id property`,
        path,
        'Remove customId or custom_id from this Premium button',
        'PREMIUM_BUTTON_HAS_CUSTOM_ID',
      );
    }
    if (payload.url) {
      report(
        state,
        'error',
        `Button with style Premium (${ButtonStyle.Premium}) must not have a url property`,
        path,
        'Remove url property from this Premium button',
        'PREMIUM_BUTTON_HAS_URL',
      );
    }
    if (payload.label) {
      report(
        state,
        'error',
        `Button with style Premium (${ButtonStyle.Premium}) must not have a label property`,
        path,
        'Remove label from this Premium button',
        'PREMIUM_BUTTON_HAS_LABEL',
      );
    }
    if (payload.emoji) {
      report(
        state,
        'error',
        `Button with style Premium (${ButtonStyle.Premium}) must not have an emoji property`,
        path,
        'Remove emoji from this Premium button',
        'PREMIUM_BUTTON_HAS_EMOJI',
      );
    }
  } else {
    if (!customId) {
      report(
        state,
        'error',
        `Button with style ${style ?? 'unknown'} must have a customId or custom_id property`,
        path,
        'Call .setCustomId() with a unique identifier on this button',
        'BUTTON_MISSING_CUSTOM_ID',
      );
    }
    if (payload.url) {
      report(
        state,
        'error',
        `Button with style ${style ?? 'unknown'} must not have a url property`,
        path,
        `Remove url property from this button, or change style to Link (${ButtonStyle.Link})`,
        'BUTTON_HAS_URL',
      );
    }
  }

  const label = payload.label;
  if (typeof label === 'string') {
    const limit = payload.emoji ? 34 : 38;
    if (label.length > limit) {
      report(
        state,
        'warning',
        `Button label length (${label.length}) exceeds the design guideline of ${limit} characters`,
        path,
        `Shorten the button label to ${limit} characters or fewer for optimal display`,
        'BUTTON_LABEL_EXCEEDS_GUIDELINE',
      );
    }
  }
}

function auditStringSelectOptions(
  options: readonly unknown[],
  path: string,
  state: AuditState,
): void {
  if (options.length < 1 || options.length > 25) {
    report(
      state,
      'error',
      `String select menu must have between 1 and 25 options (got ${options.length})`,
      path,
      'Add options or remove excess options to be within the 1-25 range',
      'STRING_SELECT_OPTIONS_LIMIT',
    );
  }

  for (let i = 0; i < options.length; i++) {
    const option = options[i] as Record<string, unknown>;
    const optionPath = `${path}.options[${i}]`;
    if (!option || typeof option !== 'object') {
      report(state, 'error', 'Select option must be an object', optionPath,
        'Provide an option with a label and value', 'SELECT_OPTION_INVALID');
      continue;
    }

    if (typeof option.label === 'string') {
      if (option.label.length > 100) {
        report(
          state,
          'error',
          `Select option label at index ${i} is too long (max 100 characters, got ${option.label.length})`,
          optionPath,
          'Shorten the option label to 100 characters or fewer',
          'SELECT_OPTION_LABEL_TOO_LONG',
        );
      }
    } else {
      report(
        state,
        'error',
        `Select option at index ${i} is missing a string label`,
        optionPath,
        'Set a valid string label for the option',
        'SELECT_OPTION_LABEL_MISSING',
      );
    }

    if (typeof option.value === 'string') {
      if (option.value.length < 1 || option.value.length > 100) {
        report(
          state,
          'error',
          `Select option value at index ${i} must be between 1 and 100 characters (got ${option.value.length})`,
          optionPath,
          'Ensure the option value is between 1 and 100 characters',
          'SELECT_OPTION_VALUE_LENGTH_INVALID',
        );
      }
    } else {
      report(
        state,
        'error',
        `Select option at index ${i} is missing a string value`,
        optionPath,
        'Set a valid string value for the option',
        'SELECT_OPTION_VALUE_MISSING',
      );
    }

    if (typeof option.description === 'string' && option.description.length > 100) {
      report(
        state,
        'error',
        `Select option description at index ${i} is too long (max 100 characters, got ${option.description.length})`,
        optionPath,
        'Shorten the option description to 100 characters or fewer',
        'SELECT_OPTION_DESCRIPTION_TOO_LONG',
      );
    }
  }
}

function auditSelectDefaultValues(
  defaults: readonly unknown[],
  type: number,
  min: number | undefined,
  max: number | undefined,
  path: string,
  state: AuditState,
): void {
  if (type === ComponentType.StringSelect) {
    report(
      state,
      'error',
      'String select menu must not have default_values property',
      path,
      'Use default property on individual select options instead',
      'STRING_SELECT_HAS_DEFAULT_VALUES',
    );
    return;
  }

  if (defaults.length > 25) {
    report(
      state,
      'error',
      `Select menu default_values exceeds the maximum of 25 (got ${defaults.length})`,
      path,
      'Reduce default_values to 25 or fewer',
      'SELECT_DEFAULT_VALUES_LIMIT_EXCEEDED',
    );
  }
  if (min !== undefined && defaults.length < min) {
    report(
      state,
      'error',
      `default_values count (${defaults.length}) is less than min_values (${min})`,
      path,
      'Ensure default_values count is at least min_values',
      'SELECT_DEFAULT_VALUES_FEWER_THAN_MIN',
    );
  }
  if (max !== undefined && defaults.length > max) {
    report(
      state,
      'error',
      `default_values count (${defaults.length}) exceeds max_values (${max})`,
      path,
      'Ensure default_values count does not exceed max_values',
      'SELECT_DEFAULT_VALUES_EXCEEDS_MAX',
    );
  }

  const allowedTypes = SELECT_DEFAULT_VALUE_TYPES.get(type) ?? [];
  for (let i = 0; i < defaults.length; i++) {
    const entry = defaults[i] as { id?: string; type?: string } | null;
    const entryPath = `${path}.default_values[${i}]`;
    if (!entry || typeof entry !== 'object') {
      report(state, 'error', 'default_value must be an object', entryPath,
        'Provide an object with id and type', 'SELECT_DEFAULT_VALUE_INVALID');
      continue;
    }
    if (!entry.id) {
      report(
        state,
        'error',
        `default_value at index ${i} is missing id`,
        entryPath,
        'Set the id for this default value',
        'SELECT_DEFAULT_VALUE_MISSING_ID',
      );
    }
    if (!entry.type) {
      report(
        state,
        'error',
        `default_value at index ${i} is missing type`,
        entryPath,
        'Set the type for this default value',
        'SELECT_DEFAULT_VALUE_MISSING_TYPE',
      );
    } else if (!allowedTypes.includes(entry.type)) {
      report(
        state,
        'error',
        `default_value type "${entry.type}" is invalid for select type ${type} (must be one of: ${allowedTypes.join(', ')})`,
        entryPath,
        `Change type to one of the allowed types: ${allowedTypes.join(', ')}`,
        'SELECT_DEFAULT_VALUE_TYPE_INVALID',
      );
    }
  }
}

function auditSelectMenu(
  payload: Record<string, unknown>,
  type: number,
  path: string,
  context: AuditContext,
  state: AuditState,
): void {
  const min = readNumber(payload, 'min_values', 'minValues');
  const max = readNumber(payload, 'max_values', 'maxValues');

  if (min !== undefined && max !== undefined && min > max) {
    report(
      state,
      'error',
      `Select menu min_values (${min}) cannot exceed max_values (${max})`,
      path,
      'Ensure min_values is less than or equal to max_values',
      'SELECT_MENU_MIN_EXCEEDS_MAX',
    );
  }
  if (min !== undefined && min < 0) {
    report(
      state,
      'error',
      'Select menu min_values must be non-negative',
      path,
      'Set min_values to 0 or greater',
      'SELECT_MENU_MIN_NEGATIVE',
    );
  }
  if (max !== undefined && max > 25) {
    report(
      state,
      'error',
      'Select menu max_values cannot exceed 25',
      path,
      'Set max_values to 25 or fewer',
      'SELECT_MENU_MAX_EXCEEDS_LIMIT',
    );
  }
  if (min === 0 && payload.required !== false) {
    report(
      state,
      'error',
      'Select menu min_values can be 0 only when required is false',
      path,
      'Omit min_values, set it to at least 1, or set required to false',
      'SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL',
    );
  }
  if (context === 'modal' && payload.disabled !== undefined) {
    report(
      state,
      'error',
      'Select menu disabled cannot be set inside modals',
      path,
      'Remove disabled from modal select menus',
      'MODAL_SELECT_DISABLED',
    );
  }

  if (type === ComponentType.StringSelect && Array.isArray(payload.options)) {
    auditStringSelectOptions(payload.options, path, state);
  }

  const defaults = readAlias(payload, 'default_values', 'defaultValues');
  if (Array.isArray(defaults)) {
    auditSelectDefaultValues(defaults, type, min, max, path, state);
  }
}

function auditOptionGroup(
  payload: Record<string, unknown>,
  label: string,
  code: string,
  path: string,
  state: AuditState,
  minimum = 2,
): void {
  const options = payload.options;
  const length = Array.isArray(options) ? options.length : 0;
  if (length < minimum || length > 10) {
    report(
      state,
      'error',
      `${label} must have between ${minimum} and 10 options (got ${length})`,
      path,
      `Add options or remove excess options to be within the ${minimum}-10 range`,
      code,
    );
  }
}

function auditFileUpload(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const min = readNumber(payload, 'min_values', 'minValues');
  const max = readNumber(payload, 'max_values', 'maxValues');

  if (min !== undefined && (min < 0 || min > 10)) {
    report(
      state,
      'error',
      'File upload min_values must be between 0 and 10',
      path,
      'Set min_values between 0 and 10',
      'FILE_UPLOAD_MIN_OUT_OF_RANGE',
    );
  }
  if (max !== undefined && (max < 1 || max > 10)) {
    report(
      state,
      'error',
      'File upload max_values must be between 1 and 10',
      path,
      'Set max_values between 1 and 10',
      'FILE_UPLOAD_MAX_OUT_OF_RANGE',
    );
  }
  if (min !== undefined && max !== undefined && min > max) {
    report(
      state,
      'error',
      `File upload min_values (${min}) cannot exceed max_values (${max})`,
      path,
      'Ensure min_values is less than or equal to max_values',
      'FILE_UPLOAD_MIN_EXCEEDS_MAX',
    );
  }
  if (min === 0 && payload.required !== false) {
    report(
      state,
      'error',
      'File upload min_values can be 0 only when required is false',
      path,
      'Omit min_values, set it to at least 1, or set required to false',
      'FILE_UPLOAD_MIN_ZERO_REQUIRES_OPTIONAL',
    );
  }

  const fileTypes = readAlias(payload, 'file_types', 'fileTypes');
  if (Array.isArray(fileTypes) && fileTypes.length > 10) {
    report(
      state,
      'error',
      `File upload file_types cannot contain more than 10 entries (got ${fileTypes.length})`,
      path,
      'Reduce file_types to 10 entries or fewer',
      'FILE_UPLOAD_FILE_TYPES_LIMIT',
    );
  }
}

function auditComponentIdentity(
  payload: Record<string, unknown>,
  path: string,
  state: AuditState,
): void {
  const id = payload.id;
  if (
    id !== undefined &&
    (!Number.isInteger(id) || (id as number) < 0 || (id as number) > MAX_COMPONENT_ID)
  ) {
    report(
      state,
      'error',
      `Component id must be a 32-bit unsigned integer (got ${String(id)})`,
      path,
      `Use .setId() with an integer between 0 and ${MAX_COMPONENT_ID}, or omit the id`,
      'INVALID_COMPONENT_ID',
    );
  }

  const customId = readAlias(payload, 'custom_id', 'customId');
  if (typeof customId !== 'string') {
    const type = payload.type as number;
    if (SELECT_MENU_TYPES.has(type) || INPUT_TYPES.has(type)) {
      report(state, 'error', 'Interactive component requires a string custom_id', path,
        'Set a custom_id of 1 to 100 characters', 'COMPONENT_MISSING_CUSTOM_ID');
    }
    return;
  }

  if (customId.length < 1 || customId.length > 100) {
    report(
      state,
      'error',
      `custom_id must be between 1 and 100 characters (got ${customId.length})`,
      path,
      'Use a non-empty custom_id no longer than 100 characters',
      'CUSTOM_ID_LENGTH_INVALID',
    );
  } else if (state.customIds.has(customId)) {
    report(
      state,
      'error',
      `Duplicate customId "${customId}" found in component tree`,
      path,
      'Ensure all interactive components have unique customId properties',
      'DUPLICATE_CUSTOM_ID',
    );
  } else {
    state.customIds.add(customId);
  }
}

function auditComponent(
  payload: Record<string, unknown>,
  type: number,
  path: string,
  context: AuditContext,
  state: AuditState,
): void {
  const constraints = SELECT_MENU_TYPES.has(type) ? SELECT_INTEGER_FIELDS
    : COMPONENT_INTEGER_FIELDS[type as ComponentType];
  if (constraints) {
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i]!;
      const value = constraint.alias ? readAlias(payload, constraint.field, constraint.alias) : payload[constraint.field];
      if (value !== undefined && !(constraint.nullable && value === null) && (!Number.isInteger(value) ||
          (value as number) < constraint.minimum || (value as number) > constraint.maximum)) {
        report(state, 'error', `${constraint.field} must be an integer between ${constraint.minimum} and ${constraint.maximum}`,
          path, `Set ${constraint.field} to an integer in range`, 'INVALID_COMPONENT_INTEGER');
      }
    }
  }
  switch (type) {
    case ComponentType.ActionRow:
      auditActionRow(payload, path, state);
      return;
    case ComponentType.Section:
      auditSection(payload, path, state);
      return;
    case ComponentType.Container:
      auditContainer(payload, path, state);
      return;
    case ComponentType.MediaGallery:
      auditMediaGallery(payload, path, state);
      return;
    case ComponentType.TextDisplay:
      auditTextDisplay(payload, path, state);
      return;
    case ComponentType.TextInput:
      auditTextInput(payload, path, state);
      return;
    case ComponentType.Thumbnail:
      if (!readMediaUrl(payload, 'media')) {
        report(
          state,
          'error',
          'Thumbnail component must have a url property',
          path,
          'Call .setURL() with a valid URL on this thumbnail',
          'THUMBNAIL_MISSING_URL',
        );
      }
      return;
    case ComponentType.File:
      if (!readMediaUrl(payload, 'file')) {
        report(
          state,
          'error',
          'File component must have a url property',
          path,
          'Call .setURL() with a valid URL on this file',
          'FILE_MISSING_URL',
        );
      }
      return;
    case ComponentType.Button:
      auditButton(payload, path, state);
      return;
    case ComponentType.RadioGroup:
      auditOptionGroup(payload, 'Radio group', 'RADIO_GROUP_OPTIONS_LIMIT', path, state);
      return;
    case ComponentType.CheckboxGroup: {
      auditOptionGroup(payload, 'Checkbox group', 'CHECKBOX_GROUP_OPTIONS_LIMIT', path, state, 1);
      const min = readAlias(payload, 'min_values', 'minValues');
      if (min === 0 && payload.required !== false) {
        report(
          state,
          'error',
          'Checkbox group min_values can be 0 only when required is false',
          path,
          'Omit min_values, set it to at least 1, or set required to false',
          'CHECKBOX_GROUP_MIN_ZERO_REQUIRES_OPTIONAL',
        );
      }
      return;
    }
    case ComponentType.FileUpload:
      auditFileUpload(payload, path, state);
      return;
    default:
      if (SELECT_MENU_TYPES.has(type)) auditSelectMenu(payload, type, path, context, state);
  }
}

function auditModal(payload: Record<string, unknown>, path: string, state: AuditState): void {
  const components = payload.components;
  const length = Array.isArray(components) ? components.length : 0;
  if (length < 1 || length > 5) {
    report(
      state,
      'error',
      `Modal must have between 1 and 5 components (got ${length})`,
      path,
      'Ensure the modal contains between 1 and 5 ActionRows',
      'MODAL_COMPONENTS_LIMIT',
    );
  }

  const title = payload.title;
  if (typeof title !== 'string' || title.length < 1 || title.length > 45) {
    report(
      state,
      'error',
      `Modal title must be between 1 and 45 characters (got ${typeof title === 'string' ? title.length : 0})`,
      path,
      'Call .setTitle() with a title of 1 to 45 characters',
      'MODAL_TITLE_LENGTH_INVALID',
    );
  }
}

function auditNode(node: unknown, path: string, context: AuditContext, state: AuditState): void {
  if (!node || typeof node !== 'object') return;
  if (state.ancestors.has(node)) {
    report(state, 'error', 'Component tree is cyclic', path,
      'Remove the reference to an ancestor', 'CYCLIC_COMPONENT_TREE');
    return;
  }
  state.ancestors.add(node);
  try {
    auditNodeContents(node, path, context, state);
  } finally {
    state.ancestors.delete(node);
  }
}

function auditNodeContents(node: object, path: string, context: AuditContext, state: AuditState): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) auditNode(node[i], `${path}[${i}]`, context, state);
    return;
  }

  let payload: Record<string, unknown> | null;
  if (typeof node === 'object' && typeof (node as { toJSON?: unknown }).toJSON === 'function') {
    try {
      payload = (node as { toJSON(): Record<string, unknown> }).toJSON();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      report(
        state,
        'warning',
        `toJSON method threw an exception:${message}`,
        path,
        'Ensure the component is fully configured before calling toJSON()',
        'TOJSON_FAILED',
      );
      payload = 'data' in node
        ? (node as { data: Record<string, unknown> }).data
        : (node as Record<string, unknown>);
    }
  } else {
    payload = node as Record<string, unknown>;
  }

  if (!payload) return;

  const type = payload.type;
  if (typeof type === 'number') {
    state.count++;
    auditComponentIdentity(payload, path, state);
    auditComponent(payload, type, path, context, state);
  } else if (
    payload.title !== undefined &&
    readAlias(payload, 'custom_id', 'customId') !== undefined
  ) {
    auditModal(payload, path, state);
  }

  for (let i = 0; i < AUDIT_TEXT_FIELDS.length; i++) {
    const text = payload[AUDIT_TEXT_FIELDS[i]!];
    if (typeof text === 'string') state.textLength += text.length;
  }

  const components = payload.components;
  if (Array.isArray(components)) {
    const prefix = path ? `${path}.components[` : 'components[';
    for (let i = 0; i < components.length; i++) {
      auditNode(components[i], `${prefix}${i}]`, context, state);
    }
  }

  const component = payload.component;
  if (component != null && typeof component === 'object') {
    const childContext = type === ComponentType.Label ? 'modal' : context;
    auditNode(component, path ? `${path}.component` : 'component', childContext, state);
  }

  const options = payload.options;
  if (Array.isArray(options)) {
    const prefix = path ? `${path}.options[` : 'options[';
    for (let i = 0; i < options.length; i++) {
      auditNode(options[i], `${prefix}${i}]`, context, state);
    }
  }

  const items = payload.items;
  if (Array.isArray(items)) {
    const prefix = path ? `${path}.items[` : 'items[';
    for (let i = 0; i < items.length; i++) {
      auditNode(items[i], `${prefix}${i}]`, context, state);
    }
  }

  const accessory = payload.accessory;
  if (accessory != null && typeof accessory === 'object') {
    auditNode(accessory, path ? `${path}.accessory` : 'accessory', context, state);
  }
}

export function auditComponentTree(root: unknown, options?: { structured?: boolean; context?: AuditContext }): (string | AuditIssue)[] {
  const rootObject = root && typeof root === 'object' ? root as Record<string, unknown> : undefined;
  const rootData = rootObject?.data && typeof rootObject.data === 'object'
    ? rootObject.data as Record<string, unknown> : rootObject;
  const context = options?.context ?? (rootData?.title !== undefined ? 'modal' : 'message');
  const state: AuditState = {
    issues: [],
    customIds: new Set<string>(),
    count: 0,
    textLength: 0,
    ancestors: new WeakSet<object>(),
  };

  auditNode(root, '', context, state);

  if (context === 'message' && state.count > MAX_TREE_COMPONENTS) {
    report(
      state,
      'error',
      `Component count (${state.count}) exceeds Discord limit of ${MAX_TREE_COMPONENTS} components`,
      '',
      `Reduce the number of components in the tree to ${MAX_TREE_COMPONENTS} or fewer`,
      'COMPONENT_COUNT_EXCEEDS_LIMIT',
    );
  }
  if (context === 'message' && state.textLength > MAX_TREE_TEXT_LENGTH) {
    report(
      state,
      'error',
      `Cumulative text length (${state.textLength}) exceeds Discord limit of ${MAX_TREE_TEXT_LENGTH} characters`,
      '',
      'Shorten the text in labels, content, descriptions, and other text fields',
      'TEXT_LENGTH_EXCEEDS_LIMIT',
    );
  }

  if (options?.structured) return state.issues;

  const messages = new Array<string>(state.issues.length);
  for (let i = 0; i < state.issues.length; i++) messages[i] = state.issues[i]!.message;
  return messages;
}
