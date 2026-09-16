import { ComponentType } from '../enums.ts';

/** Options for {@link generateComponentCode}. */
export interface ComponentCodeGeneratorOptions {
  /** Name of the exported constant. A suitable name is inferred when omitted. */
  variableName?: string;
  /** Import source used by the generated file. */
  moduleName?: string;
}

interface RenderState {
  readonly imports: Set<string>;
}

const TYPESCRIPT_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const TYPESCRIPT_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof',
  'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public',
  'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield',
]);

const COMPONENT_BUILDERS: Readonly<Record<number, string>> = Object.freeze({
  [ComponentType.ActionRow]: 'ActionRowBuilder',
  [ComponentType.Button]: 'ButtonBuilder',
  [ComponentType.StringSelect]: 'StringSelectMenuBuilder',
  [ComponentType.TextInput]: 'TextInputBuilder',
  [ComponentType.UserSelect]: 'UserSelectMenuBuilder',
  [ComponentType.RoleSelect]: 'RoleSelectMenuBuilder',
  [ComponentType.MentionableSelect]: 'MentionableSelectMenuBuilder',
  [ComponentType.ChannelSelect]: 'ChannelSelectMenuBuilder',
  [ComponentType.Section]: 'SectionBuilder',
  [ComponentType.TextDisplay]: 'TextDisplayBuilder',
  [ComponentType.Thumbnail]: 'ThumbnailBuilder',
  [ComponentType.MediaGallery]: 'MediaGalleryBuilder',
  [ComponentType.File]: 'FileBuilder',
  [ComponentType.Separator]: 'SeparatorBuilder',
  [ComponentType.Container]: 'ContainerBuilder',
  [ComponentType.Label]: 'LabelBuilder',
  [ComponentType.FileUpload]: 'FileUploadBuilder',
  [ComponentType.RadioGroup]: 'RadioGroupBuilder',
  [ComponentType.CheckboxGroup]: 'CheckboxGroupBuilder',
  [ComponentType.Checkbox]: 'CheckboxBuilder',
});

const BUTTON_STYLE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: 'Primary', 2: 'Secondary', 3: 'Success', 4: 'Danger', 5: 'Link', 6: 'Premium',
});

const TEXT_INPUT_STYLE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: 'Short', 2: 'Paragraph',
});

const SEPARATOR_SPACING_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: 'Small', 2: 'Large',
});

const CHANNEL_TYPE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: 'GuildText', 1: 'DM', 2: 'GuildVoice', 3: 'GroupDM', 4: 'GuildCategory',
  5: 'GuildAnnouncement', 10: 'AnnouncementThread', 11: 'PublicThread',
  12: 'PrivateThread', 13: 'GuildStageVoice', 14: 'GuildDirectory',
  15: 'GuildForum', 16: 'GuildMedia',
});

const MESSAGE_FLAG_NAMES: readonly (readonly [number, string])[] = Object.freeze([
  [1 << 2, 'SuppressEmbeds'],
  [1 << 6, 'Ephemeral'],
  [1 << 12, 'SuppressNotifications'],
  [1 << 13, 'VoiceMessage'],
  [1 << 15, 'IsComponentsV2'],
]);

/** Raw API field name mapped to the constructor option that sets it. */
const OPTION_NAMES: Readonly<Record<string, string>> = Object.freeze({
  custom_id: 'customId',
  min_values: 'minValues',
  max_values: 'maxValues',
  min_length: 'minLength',
  max_length: 'maxLength',
  sku_id: 'skuId',
  accent_color: 'accentColor',
  channel_types: 'channelTypes',
  file_types: 'fileTypes',
});

/**
 * Constructor options each builder accepts, in the order they are emitted.
 * Fields outside this list are either rendered as a chained call or rejected,
 * so the generated code can never pass an option a builder does not have.
 */
const CONSTRUCTOR_FIELDS: Readonly<Record<number, readonly string[]>> = Object.freeze({
  [ComponentType.ActionRow]: ['components'],
  [ComponentType.Button]: ['style', 'label', 'emoji', 'custom_id', 'url', 'sku_id', 'disabled'],
  [ComponentType.StringSelect]: ['custom_id', 'placeholder', 'options', 'min_values', 'max_values', 'required', 'disabled'],
  [ComponentType.TextInput]: ['custom_id', 'style', 'label', 'placeholder', 'value', 'min_length', 'max_length', 'required'],
  [ComponentType.UserSelect]: ['custom_id', 'placeholder', 'min_values', 'max_values', 'required', 'disabled'],
  [ComponentType.RoleSelect]: ['custom_id', 'placeholder', 'min_values', 'max_values', 'required', 'disabled'],
  [ComponentType.MentionableSelect]: ['custom_id', 'placeholder', 'min_values', 'max_values', 'required', 'disabled'],
  [ComponentType.ChannelSelect]: ['custom_id', 'placeholder', 'channel_types', 'min_values', 'max_values', 'required', 'disabled'],
  [ComponentType.Section]: ['components', 'accessory'],
  [ComponentType.TextDisplay]: ['content'],
  [ComponentType.Thumbnail]: ['url', 'description', 'spoiler'],
  [ComponentType.MediaGallery]: ['items'],
  [ComponentType.File]: ['url', 'spoiler'],
  [ComponentType.Separator]: ['divider', 'spacing'],
  [ComponentType.Container]: ['accent_color', 'spoiler', 'components'],
  [ComponentType.Label]: ['label', 'description', 'component'],
  [ComponentType.FileUpload]: ['custom_id', 'min_values', 'max_values', 'required', 'file_types'],
  [ComponentType.RadioGroup]: ['custom_id', 'options', 'required'],
  [ComponentType.CheckboxGroup]: ['custom_id', 'options', 'min_values', 'max_values', 'required'],
  [ComponentType.Checkbox]: ['custom_id', 'default'],
});

/** Select menus whose default values are applied through a chained call. */
const DEFAULT_VALUE_SETTERS: Readonly<Record<number, string>> = Object.freeze({
  [ComponentType.UserSelect]: 'setDefaultUsers',
  [ComponentType.RoleSelect]: 'setDefaultRoles',
  [ComponentType.MentionableSelect]: 'setDefaultValues',
  [ComponentType.ChannelSelect]: 'setDefaultChannels',
});

/** Option builders used by the two grouped modal inputs. */
const OPTION_BUILDERS: Readonly<Record<number, string>> = Object.freeze({
  [ComponentType.RadioGroup]: 'RadioGroupOptionBuilder',
  [ComponentType.CheckboxGroup]: 'CheckboxGroupOptionBuilder',
});

const indent = (depth: number): string => '  '.repeat(depth);

function addEnum(state: RenderState, enumName: string, member: string): string {
  state.imports.add(enumName);
  return `${enumName}.${member}`;
}

function renderNumber(
  value: number,
  key: string | undefined,
  componentType: number | undefined,
  state: RenderState,
): string {
  if (!Number.isFinite(value)) throw new Error(`Cannot generate TypeScript for non-finite number ${value}`);

  if (key === 'style' && componentType === ComponentType.Button) {
    const name = BUTTON_STYLE_NAMES[value];
    if (name !== undefined) return addEnum(state, 'ButtonStyle', name);
  }
  if (key === 'style' && componentType === ComponentType.TextInput) {
    const name = TEXT_INPUT_STYLE_NAMES[value];
    if (name !== undefined) return addEnum(state, 'TextInputStyle', name);
  }
  if (key === 'spacing' && componentType === ComponentType.Separator) {
    const name = SEPARATOR_SPACING_NAMES[value];
    if (name !== undefined) return addEnum(state, 'SeparatorSpacingSize', name);
  }
  if (key === 'flags') {
    let remainder = value;
    const members: string[] = [];
    for (const [flag, name] of MESSAGE_FLAG_NAMES) {
      if ((remainder & flag) === flag) {
        members.push(addEnum(state, 'MessageFlags', name));
        remainder &= ~flag;
      }
    }
    if (members.length > 0 && remainder === 0) return members.join(' | ');
  }
  if (key === 'channel_types' || key === 'channelTypes') {
    const name = CHANNEL_TYPE_NAMES[value];
    if (name !== undefined) return addEnum(state, 'ChannelType', name);
  }

  return String(value);
}

/** Renders a plain JSON value, used for leaf data such as emoji and default values. */
function renderValue(
  value: unknown,
  state: RenderState,
  depth: number,
  key?: string,
  componentType?: number,
): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    if (key === 'type' && (value === 'user' || value === 'role' || value === 'channel')) {
      return addEnum(state, 'SelectMenuDefaultValueType', value[0]!.toUpperCase() + value.slice(1));
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'number') return renderNumber(value, key, componentType, state);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const lines = value.map((item) => `${indent(depth + 1)}${renderValue(item, state, depth + 1, key, componentType)},`);
    return `[\n${lines.join('\n')}\n${indent(depth)}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([entryKey, entryValue]) => {
      const property = TYPESCRIPT_IDENTIFIER.test(entryKey) ? entryKey : JSON.stringify(entryKey);
      return `${indent(depth + 1)}${property}: ${renderValue(entryValue, state, depth + 1, entryKey, componentType)},`;
    });
    return `{\n${lines.join('\n')}\n${indent(depth)}}`;
  }
  throw new Error(`Cannot generate TypeScript for a ${typeof value} value`);
}

/** Assembles `{ a: 1, b: 2 }` from already rendered option expressions. */
function renderOptionObject(pairs: readonly (readonly [string, string])[], depth: number): string {
  if (pairs.length === 0) return '';
  const lines = pairs.map(([name, expression]) => `${indent(depth + 1)}${name}: ${expression},`);
  return `{\n${lines.join('\n')}\n${indent(depth)}}`;
}

/** Unwraps an unfurled media item down to the `url` the builders take. */
function readMediaUrl(raw: Record<string, unknown>, field: 'media' | 'file'): string | undefined {
  const media = raw[field];
  if (media !== null && typeof media === 'object') {
    const url = (media as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
  }
  return typeof raw.url === 'string' ? raw.url : undefined;
}

function requireComponent(component: unknown): Record<string, unknown> {
  if (component === null || typeof component !== 'object' || Array.isArray(component)) {
    throw new Error('Every component must be a JSON object');
  }
  const raw = component as Record<string, unknown>;
  if (typeof raw.type !== 'number') throw new Error('Component payload is missing a numeric type');
  if (COMPONENT_BUILDERS[raw.type] === undefined) throw new Error(`Unsupported component type: ${raw.type}`);
  return raw;
}

function assertKnownFields(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  subject: string,
): void {
  for (const field of Object.keys(raw)) {
    if (!allowed.has(field)) throw new Error(`Unsupported field ${field} on ${subject}`);
  }
}

function assertKnownComponentFields(raw: Record<string, unknown>, componentType: number): void {
  const fields = new Set<string>(['type', 'id', ...(CONSTRUCTOR_FIELDS[componentType] ?? [])]);
  if (DEFAULT_VALUE_SETTERS[componentType] !== undefined) fields.add('default_values');
  if (componentType === ComponentType.Thumbnail) fields.add('media');
  if (componentType === ComponentType.File) fields.add('file');
  assertKnownFields(raw, fields, COMPONENT_BUILDERS[componentType] ?? `component type ${componentType}`);
}

/** Renders one constructor option, dispatching the fields that hold builders. */
function renderOption(
  field: string,
  value: unknown,
  raw: Record<string, unknown>,
  componentType: number,
  state: RenderState,
  depth: number,
): string {
  if (field === 'components' || field === 'items') {
    if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
    if (value.length === 0) return '[]';
    const entries = value.map((child) => {
      const rendered = field === 'items'
        ? renderMediaItem(child, state, depth + 2)
        : renderBuilder(child, state, depth + 2);
      return `${indent(depth + 2)}${rendered},`;
    });
    return `[\n${entries.join('\n')}\n${indent(depth + 1)}]`;
  }

  if (field === 'accessory' || field === 'component') {
    return renderBuilder(value, state, depth + 1);
  }

  if (field === 'options') {
    if (!Array.isArray(value)) throw new Error('options must be an array');
    if (value.length === 0) return '[]';
    const optionBuilder = OPTION_BUILDERS[componentType];
    const entries = value.map((option) => {
      const rendered = optionBuilder === undefined
        ? renderValue(option, state, depth + 2, undefined, componentType)
        : renderOptionBuilder(optionBuilder, option, state, depth + 2);
      return `${indent(depth + 2)}${rendered},`;
    });
    return `[\n${entries.join('\n')}\n${indent(depth + 1)}]`;
  }

  if (field === 'url') {
    const url = componentType === ComponentType.File
      ? readMediaUrl(raw, 'file')
      : readMediaUrl(raw, 'media');
    return JSON.stringify(url);
  }

  return renderValue(value, state, depth + 1, field, componentType);
}

/** Renders `new RadioGroupOptionBuilder({ ... })` and its checkbox counterpart. */
function renderOptionBuilder(
  builder: string,
  option: unknown,
  state: RenderState,
  depth: number,
): string {
  if (option === null || typeof option !== 'object' || Array.isArray(option)) {
    throw new Error('Every option must be a JSON object');
  }
  state.imports.add(builder);
  const raw = option as Record<string, unknown>;
  assertKnownFields(raw, new Set(['value', 'label', 'description', 'default']), `${builder} option`);
  const pairs: (readonly [string, string])[] = [];
  for (const field of ['value', 'label', 'description', 'default'] as const) {
    if (raw[field] !== undefined) pairs.push([field, renderValue(raw[field], state, depth + 1, field)]);
  }
  return `new ${builder}(${renderOptionObject(pairs, depth)})`;
}

/** Renders `new MediaGalleryItemBuilder({ url, description, spoiler })`. */
function renderMediaItem(item: unknown, state: RenderState, depth: number): string {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('Every media gallery item must be a JSON object');
  }
  state.imports.add('MediaGalleryItemBuilder');
  const raw = item as Record<string, unknown>;
  assertKnownFields(raw, new Set(['media', 'url', 'description', 'spoiler']), 'media gallery item');
  const url = readMediaUrl(raw, 'media');
  if (url === undefined) throw new Error('Media gallery item is missing a url');

  const pairs: (readonly [string, string])[] = [['url', JSON.stringify(url)]];
  if (raw.description !== undefined) pairs.push(['description', renderValue(raw.description, state, depth + 1)]);
  if (raw.spoiler !== undefined) pairs.push(['spoiler', renderValue(raw.spoiler, state, depth + 1)]);
  return `new MediaGalleryItemBuilder(${renderOptionObject(pairs, depth)})`;
}

/**
 * Renders a component as a builder construction, so the generated code goes
 * through the same compile-time checks as hand-written code.
 */
function renderBuilder(component: unknown, state: RenderState, depth: number): string {
  const raw = requireComponent(component);
  const componentType = raw.type as number;
  const builder = COMPONENT_BUILDERS[componentType]!;
  state.imports.add(builder);
  assertKnownComponentFields(raw, componentType);

  const fields = CONSTRUCTOR_FIELDS[componentType] ?? [];
  if (componentType === ComponentType.Thumbnail && readMediaUrl(raw, 'media') === undefined) {
    throw new Error('Media component is missing a url');
  }
  if (componentType === ComponentType.File && readMediaUrl(raw, 'file') === undefined) {
    throw new Error('Media component is missing a url');
  }

  const pairs: (readonly [string, string])[] = [];
  for (const field of fields) {
    const present = field === 'url'
      ? readMediaUrl(raw, componentType === ComponentType.File ? 'file' : 'media') !== undefined
      : raw[field] !== undefined;
    if (!present) continue;
    const name = OPTION_NAMES[field] ?? field;
    pairs.push([name, renderOption(field, raw[field], raw, componentType, state, depth)]);
  }

  let expression = `new ${builder}(${renderOptionObject(pairs, depth)})`;

  const defaults = raw.default_values;
  const setter = DEFAULT_VALUE_SETTERS[componentType];
  if (defaults !== undefined && !Array.isArray(defaults)) {
    throw new Error('default_values must be an array');
  }
  if (Array.isArray(defaults) && setter !== undefined) {
    expression += `\n${indent(depth + 1)}.${setter}(${renderValue(defaults, state, depth + 1)})`;
  }

  if (raw.id !== undefined && typeof raw.id !== 'number') throw new Error('id must be a number');
  if (typeof raw.id === 'number') {
    expression += `\n${indent(depth + 1)}.setId(${raw.id})`;
  }

  return expression;
}

function renderModal(raw: Record<string, unknown>, state: RenderState, depth: number): string {
  state.imports.add('ModalBuilder');
  assertKnownFields(raw, new Set(['title', 'custom_id', 'components']), 'modal');
  const components = raw.components;
  if (!Array.isArray(components)) throw new Error('A modal must carry a components array');

  const pairs: (readonly [string, string])[] = [];
  if (raw.title !== undefined) pairs.push(['title', renderValue(raw.title, state, depth + 1)]);
  if (raw.custom_id !== undefined) pairs.push(['customId', renderValue(raw.custom_id, state, depth + 1)]);

  const rendered = components.length === 0
    ? '[]'
    : `[\n${components.map((child) => `${indent(depth + 2)}${renderBuilder(child, state, depth + 2)},`).join('\n')}\n${indent(depth + 1)}]`;
  pairs.push(['components', rendered]);

  return `new ModalBuilder(${renderOptionObject(pairs, depth)})`;
}

function renderEnvelope(payload: Record<string, unknown>, state: RenderState): string {
  const lines = Object.entries(payload).map(([key, value]) => {
    const property = TYPESCRIPT_IDENTIFIER.test(key) ? key : JSON.stringify(key);
    if (key === 'components' && Array.isArray(value)) {
      const components = value.length === 0
        ? '[]'
        : `[\n${value.map((child) => `${indent(2)}${renderBuilder(child, state, 2)}.toJSON(),`).join('\n')}\n${indent(1)}]`;
      return `${indent(1)}${property}: ${components},`;
    }
    return `${indent(1)}${property}: ${renderValue(value, state, 1, key)},`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

function renderImports(imports: ReadonlySet<string>, moduleName: string): string {
  const names = [...imports].sort();
  if (names.length === 0) return '';
  const lines = names.map((name) => `  ${name},`).join('\n');
  const source = moduleName.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  return `import {\n${lines}\n} from '${source}';`;
}

/**
 * Converts a raw Discord component payload into executable, typed builder code.
 *
 * The generated code constructs builders the same way hand-written code does, so
 * it goes through the compile-time checks rather than around them: paste a
 * payload, get code you can edit and that your editor will keep honest.
 *
 * @param payload - A component, an array of components, a modal, or a message envelope.
 * @param options - Variable name and import source for the emitted file.
 * @returns A complete TypeScript module as a string.
 * @throws If the payload is not a shape the builders can represent.
 */
export function generateComponentCode(payload: unknown, options: ComponentCodeGeneratorOptions = {}): string {
  const state: RenderState = { imports: new Set<string>() };
  let inferredName: string;
  let expression: string;

  if (Array.isArray(payload)) {
    inferredName = 'components';
    expression = payload.length === 0
      ? '[]'
      : `[\n${payload.map((child) => `${indent(1)}${renderBuilder(child, state, 1)},`).join('\n')}\n]`;
  } else if (payload !== null && typeof payload === 'object') {
    const raw = payload as Record<string, unknown>;
    if (typeof raw.type === 'number') {
      inferredName = 'component';
      expression = renderBuilder(raw, state, 0);
    } else if (typeof raw.title === 'string' && typeof raw.custom_id === 'string' && Array.isArray(raw.components)) {
      inferredName = 'modal';
      expression = renderModal(raw, state, 0);
    } else if (Array.isArray(raw.components)) {
      inferredName = 'payload';
      expression = renderEnvelope(raw, state);
    } else {
      throw new Error('Unsupported payload root: expected a component, component array, modal, or object with components');
    }
  } else {
    throw new Error('Unsupported payload root: expected a JSON object or array');
  }

  const variableName = options.variableName ?? inferredName;
  if (!TYPESCRIPT_IDENTIFIER.test(variableName) || TYPESCRIPT_RESERVED_WORDS.has(variableName)) {
    throw new Error(`variableName must be a valid TypeScript identifier, got ${JSON.stringify(variableName)}`);
  }
  const moduleName = options.moduleName ?? '@buncord/builders';
  if (moduleName.length === 0) throw new Error('moduleName cannot be empty');

  const imports = renderImports(state.imports, moduleName);
  return `${imports.length === 0 ? '' : `${imports}\n\n`}export const ${variableName} = ${expression};\n`;
}
