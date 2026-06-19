import { ComponentType, ButtonStyle } from '../enums.ts';
import type { APIComponent, JSONifiable } from '../types.ts';

const AUDIT_TEXT_FIELDS = ['content', 'label', 'description', 'placeholder', 'value', 'title'] as const;

const limitsState = {
  count: 0,
  textLen: 0,
};

function scanTreeLimits(c: unknown): void {
  if (!c) return;

  const payload = (typeof c === 'object' && c !== null && typeof (c as JSONifiable).toJSON === 'function')
    ? (c as JSONifiable).toJSON() as Record<string, unknown>
    : (c as Record<string, unknown>);

  if (typeof payload.type === 'number') limitsState.count++;

  if (typeof payload.content === 'string') limitsState.textLen += payload.content.length;
  if (typeof payload.label === 'string') limitsState.textLen += payload.label.length;
  if (typeof payload.description === 'string') limitsState.textLen += payload.description.length;
  if (typeof payload.placeholder === 'string') limitsState.textLen += payload.placeholder.length;
  if (typeof payload.value === 'string') limitsState.textLen += payload.value.length;
  if (typeof payload.title === 'string') limitsState.textLen += payload.title.length;

  const comps = payload.components;
  if (Array.isArray(comps)) {
    const len = comps.length;
    for (let i = 0; i < len; i++) scanTreeLimits(comps[i]);
  }
  const comp = payload.component;
  if (comp != null && typeof comp === 'object') {
    scanTreeLimits(comp);
  }
  const opts = payload.options;
  if (Array.isArray(opts)) {
    const len = opts.length;
    for (let i = 0; i < len; i++) scanTreeLimits(opts[i]);
  }
  const items = payload.items;
  if (Array.isArray(items)) {
    const len = items.length;
    for (let i = 0; i < len; i++) scanTreeLimits(items[i]);
  }
  const acc = payload.accessory;
  if (acc != null && typeof acc === 'object') {
    scanTreeLimits(acc);
  }
  const f = payload.file;
  if (f != null && typeof f === 'object') {
    scanTreeLimits(f);
  }
  const m = payload.media;
  if (m != null && typeof m === 'object') {
    scanTreeLimits(m);
  }
  const files = payload.files;
  if (Array.isArray(files)) {
    const len = files.length;
    for (let i = 0; i < len; i++) scanTreeLimits(files[i]);
  }
}


/**
 * Base component class for all builders.
 * Manages the component type, optional database/Discord ID, and payload serialization.
 * 
 * @template TData The shape of the raw API component payload.
 */
export abstract class BaseComponent<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Resolve components.
   */
  public static resolve?: (data: APIComponent | Record<string, unknown>) => BaseComponent;

  /**
   * The Discord component type.
   * @readonly
   */
  public abstract readonly type: ComponentType;

  /**
   * The database or Discord identifier for this component.
   */
  public id?: number;

  /**
   * The raw API payload object containing all data properties.
   */
  public readonly data: TData;

  constructor(data?: TData) {
    this.data = data ?? ({} as TData);
  }

  /**
   * Sets the database/Discord ID for this component.
   * 
   * @param id The component identifier.
   * @returns The builder instance for chaining.
   * 
   * @example
   * ```ts
   * const button = new ButtonBuilder(options).setId(12345);
   * ```
   */
  setId(id: number): this {
    if (!Number.isInteger(id) || id < 0 || id > 0xffffffff) {
      throw new Error(`id needs to be a 32-bit unsigned integer, but got ${id}`);
    }
    this.id = id;
    (this.data as Record<string, unknown>)['id'] = id;
    return this;
  }

  /**
   * Clears the database/Discord ID from this component.
   * 
   * @returns The builder instance for chaining.
   * 
   * @example
   * ```ts
   * button.clearId();
   * ```
   */
  clearId(): this {
    delete this.id;
    delete (this.data as Record<string, unknown>)['id'];
    return this;
  }

  /**
   * Serializes the builder into the raw API JSON structure expected by Discord.
   * 
   * @returns The serialized component payload.
   */
  abstract toJSON(): unknown;

  /**
   * Asserts that a string length does not exceed a maximum limit.
   * @param str The string to validate.
   * @param max The maximum allowed length.
   * @param name The name of the field for error messages.
   * @throws Error if string exceeds maximum length.
   */
  protected validateLength(str: string | undefined, max: number, name: string): void {
    if (str !== undefined && str.length > max) {
      throw new Error(`${name} is too long, max is ${max} characters but got ${str.length}`);
    }
  }

  /**
   * Asserts that a string meets a minimum length requirement.
   * @param str The string to validate.
   * @param min The minimum required length.
   * @param name The name of the field for error messages.
   * @throws Error if string is below minimum length.
   */
  protected validateMinLength(str: string, min: number, name: string): void {
    if (str.length < min) {
      throw new Error(`${name} is too short, need at least ${min} character(s) but got ${str.length}`);
    }
  }

  /**
   * Asserts that a numeric value is within an inclusive [min, max] range.
   * @param val The value to validate.
   * @param min The minimum allowed value.
   * @param max The maximum allowed value.
   * @param name The name of the field for error messages.
   * @throws Error if value is outside the range.
   */
  protected validateRange(val: number, min: number, max: number, name: string): void {
    if (val < min || val > max) {
      throw new Error(`${name} must be between ${min} and ${max}, but you set it to ${val}`);
    }
  }

  /**
   * Asserts that an array length is within an inclusive [min, max] range.
   * @param arr The array to validate.
   * @param min The minimum required elements.
   * @param max The maximum allowed elements.
   * @param name The name of the field for error messages.
   * @throws Error if array length is outside the range.
   */
  protected validateArrayLength(arr: readonly unknown[], min: number, max: number, name: string): void {
    if (arr.length < min || arr.length > max) {
      throw new Error(`${name} needs between ${min} and ${max} elements, but got ${arr.length}`);
    }
  }

  /**
   * Asserts that a URL uses a valid http or https protocol.
   * @param url The URL to validate.
   * @param name The name of the field for error messages.
   * @throws Error if URL is not http/https.
   */
  protected validateHttpUrl(url: string, name: string): void {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('discord://')) {
      throw new Error(`${name} must be a valid http, https, or discord URL, got "${url}"`);
    }
  }

  /**
   * Asserts that a Discord custom_id is within the required 1-100 character range.
   * @param customId The custom identifier to validate.
   * @param name The name of the field for error messages.
   * @throws Error if customId is outside 1-100 character range.
   */
  protected validateCustomId(customId: string, name = 'customId'): void {
    const len = customId.length;
    if (len < 1) {
      throw new Error(`${name} is too short, need at least 1 character(s) but got 0`);
    }
    if (len > 100) {
      throw new Error(`${name} is too long, max is 100 characters but got ${len}`);
    }
  }

  /**
* Validates that the total size and depth constraints of a component tree are within Discord's official limits.
* Checks that the total component count does not exceed 40 and total text lengths do not exceed 4000 characters.
* @param root - The root component builder or payload structure to validate.
* @throws If the component layout or text sizes exceed Discord limits.
*/
  public static validateTreeLimits(root: unknown): void {
    limitsState.count = 0;
    limitsState.textLen = 0;

    scanTreeLimits(root);

    if (limitsState.count > 40) {
      throw new Error(`too many components, discord limit is 40 but got ${limitsState.count}`);
    }
    if (limitsState.textLen > 4000) {
      throw new Error(`total text is too long, max 4000 characters but got ${limitsState.textLen}`);
    }
  }
  /**
* Audits a component tree structure and returns a list of warnings or errors for any Discord limit violations.
* Does not throw; returns a list of warning strings or issue objects.
* @param root - The root component builder or payload to check.
* @param options - Configuration options for the audit.
* @returns An array of warning strings or structured issue objects.
*/
  public static auditTree(root: unknown, options: { structured: true; context?: 'message' | 'modal' }): AuditIssue[];
  /**
* Audits a component tree structure and returns a list of warnings or errors for any Discord limit violations.
* Does not throw; returns a list of warning strings or issue objects.
* @param root - The root component builder or payload to check.
* @param options - Configuration options for the audit.
* @returns An array of warning strings or structured issue objects.
*/
  public static auditTree(root: unknown, options?: { structured?: false; context?: 'message' | 'modal' }): string[];
  /**
* Audits a component tree structure and returns a list of warnings or errors for any Discord limit violations.
* Does not throw; returns a list of warning strings or issue objects.
* @param root - The root component builder or payload to check.
* @param options - Configuration options for the audit.
* @returns An array of warning strings or structured issue objects.
*/
  public static auditTree(root: unknown, options?: { structured?: boolean; context?: 'message' | 'modal' }): (string | AuditIssue)[];
  /**
* Audits a component tree structure and returns a list of warnings or errors for any Discord limit violations.
* Does not throw; returns a list of warning strings or issue objects.
* @param root - The root component builder or payload to check.
* @param options - Configuration options for the audit.
* @returns An array of warning strings or structured issue objects.
*/
  public static auditTree(root: unknown, options?: { structured?: boolean; context?: 'message' | 'modal' }): (string | AuditIssue)[] {
    const issues: AuditIssue[] = [];
    let count = 0;
    let textLen = 0;
    const fields = AUDIT_TEXT_FIELDS;
    const customIds = new Set<string>();

    function report(
      severity: 'error' | 'warning',
      message: string,
      path: string,
      fix: string,
      code: string,
    ) {
      issues.push({ severity, message, path, fix, code });
    }

    function scan(c: unknown, currentPath: string, context: 'message' | 'modal'): void {
      if (!c) return;
      let payload: Record<string, unknown> | null = null;
      try {
        payload = (c && typeof c === 'object' && 'toJSON' in c && typeof (c as { toJSON: unknown }).toJSON === 'function')
          ? ((c as { toJSON(): Record<string, unknown> }).toJSON())
          : (c as Record<string, unknown>);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        report(
          'warning',
          `toJSON method threw an exception:${errMsg}`,
          currentPath,
          'Ensure the component is fully configured before calling toJSON()',
          'TOJSON_FAILED',
        );
        payload = (c && typeof c === 'object' && 'data' in c) ? (c as { data: Record<string, unknown> }).data : (c as Record<string, unknown>);
      }

      if (!payload) return;

      if (typeof payload.type === 'number') {
        count++;

        if (
          payload.id !== undefined &&
          (!Number.isInteger(payload.id) || (payload.id as number) < 0 || (payload.id as number) > 0xffffffff)
        ) {
          report(
            'error',
            `Component id must be a 32-bit unsigned integer (got ${payload.id})`,
            currentPath,
            'Use .setId() with an integer between 0 and 4294967295, or omit the id',
            'INVALID_COMPONENT_ID',
          );
        }

        const cid = payload.custom_id || payload.customId;
        if (typeof cid === 'string') {
          if (cid.length < 1 || cid.length > 100) {
            report(
              'error',
              `custom_id must be between 1 and 100 characters (got ${cid.length})`,
              currentPath,
              'Use a non-empty custom_id no longer than 100 characters',
              'CUSTOM_ID_LENGTH_INVALID',
            );
          } else if (customIds.has(cid)) {
            report(
              'error',
              `Duplicate customId "${cid}" found in component tree`,
              currentPath,
              'Ensure all interactive components have unique customId properties',
              'DUPLICATE_CUSTOM_ID',
            );
          } else {
            customIds.add(cid);
          }
        }

        const type = payload.type as number;
        if (type === ComponentType.ActionRow) { // Action rows
          if (!payload.components || !Array.isArray(payload.components) || payload.components.length === 0) report(
            'error',
            `ActionRow (type ${ComponentType.ActionRow}) must contain at least 1 child component`,
            currentPath,
            'Add at least one child component to the ActionRow',
            'ACTION_ROW_EMPTY',
          );
          if (payload.components && Array.isArray(payload.components)) {
            if (payload.components.length > 5) report(
              'error',
              `ActionRow can't contain more than 5 child components (got ${payload.components.length})`,
              currentPath,
              'Reduce components in ActionRow to 5 or fewer',
              'ACTION_ROW_LIMIT_EXCEEDED',
            );

            // mixed components not allowed: buttons vs selects vs textinputs
            let hasBtn = false;
            let hasSel = false;
            let hasTxt = false;
            let invalidChild = false;
            for (const child of payload.components) {
              const ct = (child as { type?: number }).type;
              if (ct === ComponentType.Button) hasBtn = true;
              else if (ct === ComponentType.TextInput) hasTxt = true;
              else if ([ComponentType.StringSelect, ComponentType.UserSelect, ComponentType.RoleSelect, ComponentType.MentionableSelect, ComponentType.ChannelSelect].includes(ct as number)) hasSel = true;
              else invalidChild = true;
            }
            if (invalidChild) report(
              'error',
              'ActionRow contains invalid component types (only buttons, select menus, and text inputs are allowed)',
              currentPath,
              'Remove invalid component types from the ActionRow',
              'ACTION_ROW_INVALID_COMPONENT_TYPE',
            );
            if ((hasBtn && hasSel) || (hasBtn && hasTxt) || (hasSel && hasTxt)) report(
              'error',
              'ActionRow cannot mix buttons, select menus, and text inputs',
              currentPath,
              'Ensure the ActionRow contains either only buttons, or a single select menu, or a single text input',
              'ACTION_ROW_MIXED_COMPONENTS',
            );
            if (hasSel && payload.components.length > 1) report(
              'error',
              `ActionRow can only contain 1 select menu, but got ${payload.components.length}`,
              currentPath,
              'Ensure the ActionRow contains exactly 1 select menu and no other components',
              'ACTION_ROW_MULTIPLE_SELECTS',
            );
            if (hasTxt && payload.components.length > 1) report(
              'error',
              `ActionRow can only contain 1 text input, but got ${payload.components.length}`,
              currentPath,
              'Ensure the ActionRow contains exactly 1 text input and no other components',
              'ACTION_ROW_MULTIPLE_TEXT_INPUTS',
            );
          }
        } else if (type === ComponentType.Section) { // Sections
          const len = Array.isArray(payload.components) ? (payload.components as unknown[]).length : 0;
          if (len < 1 || len > 3) {
            report(
              'error',
              `Section must contain between 1 and 3 child components (got ${len})`,
              currentPath,
              'Adjust Section components to be between 1 and 3',
              'SECTION_COMPONENTS_LIMIT',
            );
          }
          if (Array.isArray(payload.components)) {
            for (const comp of payload.components) {
              if (comp.type !== ComponentType.TextDisplay) {
                report(
                  'error',
                  `Section can only contain TextDisplay components, but got type ${comp.type}`,
                  currentPath,
                  'Only add TextDisplay components inside Section',
                  'SECTION_INVALID_CHILD_TYPE',
                );
              }
            }
          }
          const acc = payload.accessory;
          if (acc !== undefined && acc !== null) {
            const accType = (acc as { type?: number }).type;
            if (accType !== ComponentType.Button && accType !== ComponentType.Thumbnail) {
              report(
                'error',
                `Section accessory must be a Button (type ${ComponentType.Button}) or Thumbnail (type ${ComponentType.Thumbnail}), but got type ${accType}`,
                currentPath,
                'Use a Button or Thumbnail component as the Section accessory',
                'SECTION_ACCESSORY_INVALID_TYPE',
              );
            }
          }
        } else if (type === ComponentType.Container) { // Containers
          const len = Array.isArray(payload.components) ? (payload.components as unknown[]).length : 0;
          if (len < 1 || len > 10) {
            report(
              'error',
              `Container must contain between 1 and 10 child components (got ${len})`,
              currentPath,
              'Add between 1 and 10 components to this container',
              'CONTAINER_COMPONENTS_LIMIT',
            );
          }
          const allowedContainerChildren = new Set<number>([
            ComponentType.ActionRow,
            ComponentType.TextDisplay,
            ComponentType.Section,
            ComponentType.MediaGallery,
            ComponentType.Separator,
            ComponentType.File,
          ]);
          if (Array.isArray(payload.components)) {
            payload.components.forEach((comp: unknown, idx: number) => {
              const ctype = (comp as { type?: number }).type;
              if (ctype === undefined || !allowedContainerChildren.has(ctype)) {
                report(
                  'error',
                  `Container child component at index ${idx} has invalid type ${ctype} (only ActionRow, TextDisplay, Section, MediaGallery, Separator, and File are allowed)`,
                  `${currentPath}.components[${idx}]`,
                  'Remove or move the invalid component out of the Container',
                  'CONTAINER_CHILD_INVALID_TYPE',
                );
              }
            });
          }
        } else if (type === ComponentType.MediaGallery) { // Media Gallery
          const len = Array.isArray(payload.items) ? (payload.items as unknown[]).length : 0;
          if (len < 1 || len > 10) {
            report(
              'error',
              `Media gallery must contain between 1 and 10 items (got ${len})`,
              currentPath,
              'Add between 1 and 10 items to the media gallery',
              'MEDIA_GALLERY_ITEMS_LIMIT',
            );
          }
          if (Array.isArray(payload.items)) {
            payload.items.forEach((item: unknown, idx: number) => {
              const it = item as { description?: string; media?: { url?: string } };
              if (!it.media || !it.media.url) report(
                'error',
                `Media gallery item at index ${idx} must have a media URL`,
                `${currentPath}.items[${idx}]`,
                'Ensure the item has a valid URL',
                'MEDIA_GALLERY_ITEM_MISSING_URL',
              );
              if (it.description !== undefined && it.description !== null) {
                if (it.description.length > 1024) report(
                  'error',
                  `Media gallery item description at index ${idx} is too long (max 1024 characters, got ${it.description.length})`,
                  `${currentPath}.items[${idx}]`,
                  'Shorten the item description to 1024 characters or fewer',
                  'MEDIA_GALLERY_ITEM_DESCRIPTION_TOO_LONG',
                );
              }
            });
          }
        } else if (type === ComponentType.TextDisplay) {
          const content = payload.content;
          if (typeof content !== 'string') report(
            'error',
            'TextDisplay content is required and must be a string',
            currentPath,
            'Call .setContent() with a non-empty markdown string',
            'TEXT_DISPLAY_CONTENT_REQUIRED',
          );
          else if (content.length < 1 || content.length > 4000) report(
            'error',
            `TextDisplay content must be between 1 and 4000 characters (got ${content.length})`,
            currentPath,
            'Shorten or populate the content of this TextDisplay component',
            'TEXT_DISPLAY_CONTENT_LENGTH_INVALID',
          );
        } else if (type === ComponentType.TextInput) { // Text Input
          const min = payload.min_length !== undefined ? (payload.min_length as number) : (payload.minLength as number | undefined);
          const max = payload.max_length !== undefined ? (payload.max_length as number) : (payload.maxLength as number | undefined);
          const val = payload.value;
          if (min !== undefined && max !== undefined && min > max) {
            report(
              'error',
              `Text input min_length (${min}) cannot exceed max_length (${max})`,
              currentPath,
              'Ensure min_length is less than or equal to max_length',
              'TEXT_INPUT_MIN_EXCEEDS_MAX',
            );
          }
          if (typeof val === 'string') {
            if (min !== undefined && val.length < min) {
              report(
                'error',
                `Text input value is too short, needs at least ${min} chars but got ${val.length}`,
                currentPath,
                'Ensure text value is at least min_length',
                'TEXT_INPUT_VALUE_TOO_SHORT',
              );
            }
            if (max !== undefined && val.length > max) {
              report(
                'error',
                `Text input value is too long, max is ${max} chars but got ${val.length}`,
                currentPath,
                'Ensure text value does not exceed max_length',
                'TEXT_INPUT_VALUE_TOO_LONG',
              );
            }
          }
        } else if (type === ComponentType.Thumbnail) { // Thumbnail
          if (!payload.url) {
            report(
              'error',
              'Thumbnail component must have a url property',
              currentPath,
              'Call .setURL() with a valid URL on this thumbnail',
              'THUMBNAIL_MISSING_URL',
            );
          }
        } else if (type === ComponentType.File) { // File
          if (!payload.url) {
            report(
              'error',
              'File component must have a url property',
              currentPath,
              'Call .setURL() with a valid URL on this file',
              'FILE_MISSING_URL',
            );
          }
        } else if (type === ComponentType.Button) { // Buttons
          const style = payload.style;
          if (style === ButtonStyle.Link) { // Link button
            if (!payload.url) {
              report(
                'error',
                `Button with style Link (${ButtonStyle.Link}) must have a url property`,
                currentPath,
                'Call .setURL() with a valid URL on this button',
                'LINK_BUTTON_MISSING_URL',
              );
            }
            if (payload.custom_id || payload.customId) {
              report(
                'error',
                `Button with style Link (${ButtonStyle.Link}) must not have a customId or custom_id property`,
                currentPath,
                'Remove customId or custom_id from this Link button',
                'LINK_BUTTON_HAS_CUSTOM_ID',
              );
            }
            if (!payload.label && !payload.emoji) report(
              'error',
              `Button with style Link (${ButtonStyle.Link}) must have either a label or an emoji`,
              currentPath,
              'Add a label or emoji to this Link button',
              'LINK_BUTTON_MISSING_LABEL_OR_EMOJI',
            );
          } else if (style === ButtonStyle.Premium) { // Premium button
            const skuId = payload.sku_id || payload.skuId;
            if (!skuId) {
              report(
                'error',
                `Button with style Premium (${ButtonStyle.Premium}) must have a skuId or sku_id property`,
                currentPath,
                'Call .setSKUId() with a valid SKU ID on this button',
                'PREMIUM_BUTTON_MISSING_SKU_ID',
              );
            }
            if (payload.custom_id || payload.customId) {
              report(
                'error',
                `Button with style Premium (${ButtonStyle.Premium}) must not have a customId or custom_id property`,
                currentPath,
                'Remove customId or custom_id from this Premium button',
                'PREMIUM_BUTTON_HAS_CUSTOM_ID',
              );
            }
            if (payload.url) {
              report(
                'error',
                `Button with style Premium (${ButtonStyle.Premium}) must not have a url property`,
                currentPath,
                'Remove url property from this Premium button',
                'PREMIUM_BUTTON_HAS_URL',
              );
            }
            if (payload.label) report(
              'error',
              `Button with style Premium (${ButtonStyle.Premium}) must not have a label property`,
              currentPath,
              'Remove label from this Premium button',
              'PREMIUM_BUTTON_HAS_LABEL',
            );
            if (payload.emoji) report(
              'error',
              `Button with style Premium (${ButtonStyle.Premium}) must not have an emoji property`,
              currentPath,
              'Remove emoji from this Premium button',
              'PREMIUM_BUTTON_HAS_EMOJI',
            );
          } else { // Regular button
            const cidVal = payload.custom_id || payload.customId;
            if (!cidVal) {
              report(
                'error',
                `Button with style ${style ?? 'unknown'} must have a customId or custom_id property`,
                currentPath,
                'Call .setCustomId() with a unique identifier on this button',
                'BUTTON_MISSING_CUSTOM_ID',
              );
            }
            if (payload.url) {
              report(
                'error',
                `Button with style ${style ?? 'unknown'} must not have a url property`,
                currentPath,
                `Remove url property from this button, or change style to Link (${ButtonStyle.Link})`,
                'BUTTON_HAS_URL',
              );
            }
          }
          // design guideline warning
          if (typeof payload.label === 'string') {
            const limit = payload.emoji ? 34 : 38;
            if (payload.label.length > limit) report(
              'warning',
              `Button label length (${payload.label.length}) exceeds the design guideline of ${limit} characters`,
              currentPath,
              `Shorten the button label to ${limit} characters or fewer for optimal display`,
              'BUTTON_LABEL_EXCEEDS_GUIDELINE',
            );
          }
        } else if (
          ([
            ComponentType.StringSelect,
            ComponentType.UserSelect,
            ComponentType.RoleSelect,
            ComponentType.MentionableSelect,
            ComponentType.ChannelSelect,
          ] as ComponentType[]).includes(type)
        ) { // Select menus
          const min = payload.min_values !== undefined ? (payload.min_values as number) : (payload.minValues as number | undefined);
          const max = payload.max_values !== undefined ? (payload.max_values as number) : (payload.maxValues as number | undefined);
          const required = payload.required;
          if (min !== undefined && max !== undefined) {
            if (min > max) {
              report(
                'error',
                `Select menu min_values (${min}) cannot exceed max_values (${max})`,
                currentPath,
                'Ensure min_values is less than or equal to max_values',
                'SELECT_MENU_MIN_EXCEEDS_MAX',
              );
            }
          }
          if (min !== undefined && min < 0) {
            report(
              'error',
              'Select menu min_values must be non-negative',
              currentPath,
              'Set min_values to 0 or greater',
              'SELECT_MENU_MIN_NEGATIVE',
            );
          }
          if (max !== undefined && max > 25) {
            report(
              'error',
              'Select menu max_values cannot exceed 25',
              currentPath,
              'Set max_values to 25 or fewer',
              'SELECT_MENU_MAX_EXCEEDS_LIMIT',
            );
          }
          if (min === 0 && required !== false) {
            report(
              'error',
              'Select menu min_values can be 0 only when required is false',
              currentPath,
              'Omit min_values, set it to at least 1, or set required to false',
              'SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL',
            );
          }
          if (context === 'modal' && payload.disabled !== undefined) {
            report(
              'error',
              'Select menu disabled cannot be set inside modals',
              currentPath,
              'Remove disabled from modal select menus',
              'MODAL_SELECT_DISABLED',
            );
          }

          if (type === ComponentType.StringSelect) { // String select menu
            const opts = payload.options;
            if (opts && Array.isArray(opts)) {
              if (opts.length < 1 || opts.length > 25) {
                report(
                  'error',
                  `String select menu must have between 1 and 25 options (got ${opts.length})`,
                  currentPath,
                  'Add options or remove excess options to be within the 1-25 range',
                  'STRING_SELECT_OPTIONS_LIMIT',
                );
              }
              opts.forEach((opt: unknown, idx: number) => {
                const o = opt as Record<string, unknown>;
                if (typeof o.label === 'string') {
                  if (o.label.length > 100) report(
                    'error',
                    `Select option label at index ${idx} is too long (max 100 characters, got ${o.label.length})`,
                    `${currentPath}.options[${idx}]`,
                    'Shorten the option label to 100 characters or fewer',
                    'SELECT_OPTION_LABEL_TOO_LONG',
                  );
                } else report(
                  'error',
                  `Select option at index ${idx} is missing a string label`,
                  `${currentPath}.options[${idx}]`,
                  'Set a valid string label for the option',
                  'SELECT_OPTION_LABEL_MISSING',
                );
                if (typeof o.value === 'string') {
                  if (o.value.length < 1 || o.value.length > 100) report(
                    'error',
                    `Select option value at index ${idx} must be between 1 and 100 characters (got ${o.value.length})`,
                    `${currentPath}.options[${idx}]`,
                    'Ensure the option value is between 1 and 100 characters',
                    'SELECT_OPTION_VALUE_LENGTH_INVALID',
                  );
                } else report(
                  'error',
                  `Select option at index ${idx} is missing a string value`,
                  `${currentPath}.options[${idx}]`,
                  'Set a valid string value for the option',
                  'SELECT_OPTION_VALUE_MISSING',
                );
                if (o.description !== undefined && typeof o.description === 'string' && o.description.length > 100) report(
                  'error',
                  `Select option description at index ${idx} is too long (max 100 characters, got ${o.description.length})`,
                  `${currentPath}.options[${idx}]`,
                  'Shorten the option description to 100 characters or fewer',
                  'SELECT_OPTION_DESCRIPTION_TOO_LONG',
                );
              });
            }
          }

          // validate default_values for select menus
          const defaults = payload.default_values || payload.defaultValues;
          if (Array.isArray(defaults)) {
            if (type === ComponentType.StringSelect) report(
              'error',
              'String select menu must not have default_values property',
              currentPath,
              'Use default property on individual select options instead',
              'STRING_SELECT_HAS_DEFAULT_VALUES',
            );
            else {
              if (defaults.length > 25) report(
                'error',
                `Select menu default_values exceeds the maximum of 25 (got ${defaults.length})`,
                currentPath,
                'Reduce default_values to 25 or fewer',
                'SELECT_DEFAULT_VALUES_LIMIT_EXCEEDED',
              );
              if (min !== undefined && defaults.length < min) report(
                'error',
                `default_values count (${defaults.length}) is less than min_values (${min})`,
                currentPath,
                'Ensure default_values count is at least min_values',
                'SELECT_DEFAULT_VALUES_FEWER_THAN_MIN',
              );
              if (max !== undefined && defaults.length > max) report(
                'error',
                `default_values count (${defaults.length}) exceeds max_values (${max})`,
                currentPath,
                'Ensure default_values count does not exceed max_values',
                'SELECT_DEFAULT_VALUES_EXCEEDS_MAX',
              );
              const allowedTypes: string[] = [];
              if (type === ComponentType.UserSelect) allowedTypes.push('user');
              else if (type === ComponentType.RoleSelect) allowedTypes.push('role');
              else if (type === ComponentType.MentionableSelect) allowedTypes.push('user', 'role');
              else if (type === ComponentType.ChannelSelect) allowedTypes.push('channel');

              defaults.forEach((def: unknown, idx: number) => {
                const d = def as { id?: string; type?: string };
                if (!d.id) report(
                  'error',
                  `default_value at index ${idx} is missing id`,
                  `${currentPath}.default_values[${idx}]`,
                  'Set the id for this default value',
                  'SELECT_DEFAULT_VALUE_MISSING_ID',
                );
                if (!d.type) report(
                  'error',
                  `default_value at index ${idx} is missing type`,
                  `${currentPath}.default_values[${idx}]`,
                  'Set the type for this default value',
                  'SELECT_DEFAULT_VALUE_MISSING_TYPE',
                );
                else if (!allowedTypes.includes(d.type)) report(
                  'error',
                  `default_value type "${d.type}" is invalid for select type ${type} (must be one of: ${allowedTypes.join(', ')})`,
                  `${currentPath}.default_values[${idx}]`,
                  `Change type to one of the allowed types: ${allowedTypes.join(', ')}`,
                  'SELECT_DEFAULT_VALUE_TYPE_INVALID',
                );
              });
            }
          }
        } else if (type === ComponentType.RadioGroup) { // Radio groups
          const opts = payload.options;
          if (opts && Array.isArray(opts)) {
            if (opts.length < 2 || opts.length > 10) {
              report(
                'error',
                `Radio group must have between 2 and 10 options (got ${opts.length})`,
                currentPath,
                'Add options or remove excess options to be within the 2-10 range',
                'RADIO_GROUP_OPTIONS_LIMIT',
              );
            }
          }
        } else if (type === ComponentType.CheckboxGroup) { // Checkbox groups
          const opts = payload.options;
          if (opts && Array.isArray(opts)) {
            if (opts.length < 2 || opts.length > 10) {
              report(
                'error',
                `Checkbox group must have between 2 and 10 options (got ${opts.length})`,
                currentPath,
                'Add options or remove excess options to be within the 2-10 range',
                'CHECKBOX_GROUP_OPTIONS_LIMIT',
              );
            }
          }
          const min = payload.min_values !== undefined ? payload.min_values : payload.minValues;
          if (min === 0 && payload.required !== false) {
            report(
              'error',
              'Checkbox group min_values can be 0 only when required is false',
              currentPath,
              'Omit min_values, set it to at least 1, or set required to false',
              'CHECKBOX_GROUP_MIN_ZERO_REQUIRES_OPTIONAL',
            );
          }
        } else if (type === ComponentType.FileUpload) {
          const min = payload.min_values !== undefined ? (payload.min_values as number) : (payload.minValues as number | undefined);
          const max = payload.max_values !== undefined ? (payload.max_values as number) : (payload.maxValues as number | undefined);
          if (min !== undefined && (min < 0 || min > 10)) {
            report(
              'error',
              'File upload min_values must be between 0 and 10',
              currentPath,
              'Set min_values between 0 and 10',
              'FILE_UPLOAD_MIN_OUT_OF_RANGE',
            );
          }
          if (max !== undefined && (max < 1 || max > 10)) {
            report(
              'error',
              'File upload max_values must be between 1 and 10',
              currentPath,
              'Set max_values between 1 and 10',
              'FILE_UPLOAD_MAX_OUT_OF_RANGE',
            );
          }
          if (min !== undefined && max !== undefined && min > max) {
            report(
              'error',
              `File upload min_values (${min}) cannot exceed max_values (${max})`,
              currentPath,
              'Ensure min_values is less than or equal to max_values',
              'FILE_UPLOAD_MIN_EXCEEDS_MAX',
            );
          }
          if (min === 0 && payload.required !== false) {
            report(
              'error',
              'File upload min_values can be 0 only when required is false',
              currentPath,
              'Omit min_values, set it to at least 1, or set required to false',
              'FILE_UPLOAD_MIN_ZERO_REQUIRES_OPTIONAL',
            );
          }
        }
      } else if (payload.title !== undefined && (payload.custom_id !== undefined || payload.customId !== undefined)) {
        // Modal checks
        const len = Array.isArray(payload.components) ? (payload.components as unknown[]).length : 0;
        if (len < 1 || len > 5) {
          report(
            'error',
            `Modal must have between 1 and 5 components (got ${len})`,
            currentPath,
            'Ensure the modal contains between 1 and 5 ActionRows',
            'MODAL_COMPONENTS_LIMIT',
          );
        }
      }

      for (const key of fields) {
        const v = payload[key];
        if (typeof v === 'string') textLen += v.length;
      }

      // Recursively traverse the component tree and build the path
      if (Array.isArray(payload.components)) {
        payload.components.forEach((child: unknown, idx: number) => {
          scan(child, currentPath ? `${currentPath}.components[${idx}]` : `components[${idx}]`, context);
        });
      }
      if (payload.component != null && typeof payload.component === 'object') {
        const childContext = payload.type === ComponentType.Label ? 'modal' : context;
        scan(payload.component, currentPath ? `${currentPath}.component` : `component`, childContext);
      }
      if (Array.isArray(payload.options)) {
        payload.options.forEach((opt: unknown, idx: number) => {
          scan(opt, currentPath ? `${currentPath}.options[${idx}]` : `options[${idx}]`, context);
        });
      }
      if (Array.isArray(payload.items)) {
        payload.items.forEach((item: unknown, idx: number) => {
          scan(item, currentPath ? `${currentPath}.items[${idx}]` : `items[${idx}]`, context);
        });
      }
      if (payload.accessory != null && typeof payload.accessory === 'object') {
        scan(payload.accessory, currentPath ? `${currentPath}.accessory` : `accessory`, context);
      }
      if (payload.file != null && typeof payload.file === 'object') {
        scan(payload.file, currentPath ? `${currentPath}.file` : `file`, context);
      }
      if (payload.media != null && typeof payload.media === 'object') {
        scan(payload.media, currentPath ? `${currentPath}.media` : `media`, context);
      }
      if (Array.isArray(payload.files)) {
        payload.files.forEach((f: unknown, idx: number) => {
          scan(f, currentPath ? `${currentPath}.files[${idx}]` : `files[${idx}]`, context);
        });
      }
    }

    scan(root, '', options?.context ?? 'message');

    // Global limits check
    if (count > 40) {
      report(
        'error',
        `Component count (${count}) exceeds Discord limit of 40 components`,
        '',
        'Reduce the number of components in the tree to 40 or fewer',
        'COMPONENT_COUNT_EXCEEDS_LIMIT',
      );
    }
    if (textLen > 4000) {
      report(
        'error',
        `Cumulative text length (${textLen}) exceeds Discord limit of 4000 characters`,
        '',
        'Shorten the text in labels, content, descriptions, and other text fields',
        'TEXT_LENGTH_EXCEEDS_LIMIT',
      );
    }

    if (options?.structured) {
      return issues;
    }
    return issues.map((i) => i.message);
  }



  /**
   * Creates a deep copy of this component builder instance.
   * Useful for reusing layout configurations or duplicating buttons/inputs with minor modifications.
   * 
   * @returns A cloned builder instance of the same class type.
   * 
   * @example
   * ```ts
   * const nextBtn = baseBtn.clone().setCustomId('next_page').setLabel('Next Page');
   * ```
   */
  clone(): this {
    const ctor = this.constructor as unknown as { from?: (data: unknown) => unknown };
    if (typeof ctor.from === 'function') {
      return ctor.from(this.toJSON()) as this;
    }
    throw new Error(`can't clone component of type ${this.type} because it doesn't have a static from method`);
  }
}

// Shared helper for from() in classes that do not inherit from BaseComponent
/**
* Resolves a raw Discord API component payload from a builder instance or raw object.
* If the input has a toJSON method, it calls it to resolve the payload.
* @param data - The component data payload or builder to resolve.
* @returns The resolved raw API payload.
*/
export function resolveRaw(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && 'toJSON' in data && typeof (data as { toJSON: unknown }).toJSON === 'function')
    return (data as { toJSON(): Record<string, unknown> }).toJSON();
  return data as Record<string, unknown>;
}

export interface AuditIssue {
  severity: 'error' | 'warning';
  message: string;
  path: string;
  fix: string;
  code: string;
}
