import { ComponentType } from '../enums.ts';
import type { APIComponent } from '../types.ts';
import { MAX_COMPONENT_ID } from '../utils/ComponentConstraints.ts';
import { componentError } from '../utils/ComponentError.ts';
import { validateComponentTree } from '../utils/ComponentTree.ts';
import { auditComponentTree } from '../utils/ComponentAudit.ts';
import type { AuditContext, AuditIssue } from '../utils/ComponentAudit.ts';

export { CONTAINER_CHILD_TYPES } from '../utils/ComponentConstraints.ts';
export type { AuditContext, AuditIssue } from '../utils/ComponentAudit.ts';

/**
 * Resolves a builder or raw payload down to its plain API representation.
 *
 * @param data - Component payload or builder to resolve.
 * @returns The resolved raw API payload.
 */
export function resolveRaw(data: unknown): Record<string, unknown> {
  if (data && typeof (data as { toJSON?: unknown }).toJSON === 'function')
    return (data as { toJSON(): Record<string, unknown> }).toJSON();
  return data as Record<string, unknown>;
}

/** A list entry that may already be a plain payload or still be a builder. */
type SerializableEntry = { toJSON?(): unknown };

/**
 * Serializes a list of options or items in a single pass, reusing the source
 * array when every entry is already a plain payload so the common case
 * allocates nothing.
 *
 * @param entries - Plain payloads, builders, or a mix of both.
 * @returns The serialized entries.
 */
export function serializeEntries<T>(entries: readonly unknown[] | undefined): T[] {
  if (!entries) return [];

  const len = entries.length;
  let serialized: T[] | undefined;
  for (let i = 0; i < len; i++) {
    const entry = entries[i] as SerializableEntry;
    if (!entry || typeof entry.toJSON !== 'function') {
      if (serialized) serialized[i] = entry as unknown as T;
      continue;
    }
    if (!serialized) {
      serialized = new Array<T>(len);
      for (let j = 0; j < i; j++) serialized[j] = entries[j] as T;
    }
    serialized[i] = entry.toJSON() as T;
  }

  return serialized ?? (entries as unknown as T[]);
}

/**
 * Base class for all component builders.
 * Handles component type, optional Discord component ID, and payload serialization.
 *
 * @template TData The shape of the raw API component payload.
 */
export abstract class BaseComponent<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Resolves a raw payload into the matching builder.
   * Wired up by `ComponentFactory` to avoid a circular import.
   */
  public static resolve?: (data: APIComponent | Record<string, unknown>) => BaseComponent;

  /**
   * The Discord component type.
   * @readonly
   */
  public abstract readonly type: ComponentType;

  /**
   * Raw API payload backing this builder.
   *
   * It only ever holds fields that were actually set, so it is already
   * wire-ready and {@link toJSON} can hand it back without copying.
   */
  public readonly data: TData;

  constructor(data?: TData) {
    this.data = data ?? ({} as TData);
  }

  /**
   * The optional component identifier, backed directly by the raw payload.
   *
   * @returns The component identifier, or `undefined` when unset.
   */
  public get id(): number | undefined {
    return this.data.id as number | undefined;
  }

  public set id(value: number | undefined) {
    if (value === undefined) {
      delete this.data.id;
      return;
    }
    if (!Number.isInteger(value) || value < 0 || value > MAX_COMPONENT_ID) {
      throw componentError(`id needs to be a 32-bit unsigned integer, but got ${value}`, {
        code: 'INVALID_COMPONENT_ID',
        fix: `Use .setId() with an integer between 0 and ${MAX_COMPONENT_ID}, or omit the id`,
      });
    }
    (this.data as Record<string, unknown>).id = value;
  }

  /**
   * Sets the Discord component ID.
   *
   * @param id - The component identifier (0 to 4294967295).
   * @returns The builder instance for chaining.
   * @throws If `id` is not a 32-bit unsigned integer.
   *
   * @example
   * ```ts
   * const button = new ButtonBuilder(options).setId(12345);
   * ```
   */
  setId(id: number): this {
    this.id = id;
    return this;
  }

  /**
   * Clears the Discord component ID.
   *
   * @returns The builder instance for chaining.
   *
   * @example
   * ```ts
   * button.clearId();
   * ```
   */
  clearId(): this {
    delete this.data.id;
    return this;
  }

  /**
   * Serializes the builder to the raw API JSON structure for Discord.
   *
   * Serialization is zero-copy wherever possible: the returned payload may be
   * the builder's own {@link data} object rather than a copy. Treat it as
   * read-only, and clone the builder first if you need to edit the result
   * independently. Calling `toJSON()` never mutates the builder.
   *
   * @returns Serialized component payload.
   */
  abstract toJSON(): unknown;

  /**
   * Checks that a string does not exceed a maximum length.
   *
   * @param str - String to validate.
   * @param max - Max allowed length.
   * @param name - Field name used in the error message.
   * @throws If the string is too long.
   */
  protected validateLength(str: string | undefined, max: number, name: string): void {
    if (str !== undefined && str.length > max) {
      throw componentError(`${name} is too long, max is ${max} characters but got ${str.length}`, {
        code: 'STRING_TOO_LONG',
        path: name,
        fix: `Shorten ${name} to ${max} characters or fewer`,
      });
    }
  }

  /**
   * Checks that a string meets a minimum length.
   *
   * @param str - String to validate.
   * @param min - Min required length.
   * @param name - Field name used in the error message.
   * @throws If the string is below the minimum length.
   */
  protected validateMinLength(str: string, min: number, name: string): void {
    if (str.length < min) {
      throw componentError(`${name} is too short, need at least ${min} character(s) but got ${str.length}`, {
        code: 'STRING_TOO_SHORT',
        path: name,
        fix: `Give ${name} at least ${min} character(s)`,
      });
    }
  }

  /**
   * Checks that a number sits inside an inclusive range.
   *
   * @param val - Value to validate.
   * @param min - Min allowed value.
   * @param max - Max allowed value.
   * @param name - Field name used in the error message.
   * @throws If the value is out of range.
   */
  protected validateRange(val: number, min: number, max: number, name: string): void {
    if (!Number.isInteger(val) || val < min || val > max) {
      throw componentError(`${name} must be between ${min} and ${max}, but you set it to ${val}`, {
        code: 'VALUE_OUT_OF_RANGE',
        path: name,
        fix: `Set ${name} to an integer between ${min} and ${max}`,
      });
    }
  }

  /**
   * Checks that an array length sits inside an inclusive range.
   *
   * @param arr - Array to validate.
   * @param min - Min elements required.
   * @param max - Max elements allowed.
   * @param name - Field name used in the error message.
   * @throws If the array size is out of range.
   */
  protected validateArrayLength(arr: readonly unknown[], min: number, max: number, name: string): void {
    if (arr.length < min || arr.length > max) {
      throw componentError(`${name} needs between ${min} and ${max} elements, but got ${arr.length}`, {
        code: 'ARRAY_LENGTH_INVALID',
        path: name,
        fix: `Keep ${name} between ${min} and ${max} elements`,
      });
    }
  }

  /**
   * Checks that a URL uses a scheme Discord accepts on link buttons.
   *
   * @param url - URL to validate.
   * @param name - Field name used in the error message.
   * @throws If the URL is not http, https, or discord.
   */
  protected validateHttpUrl(url: string, name: string): void {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('discord://')) {
      throw componentError(`${name} must be a valid http, https, or discord URL, got "${url}"`, {
        code: 'INVALID_URL_SCHEME',
        path: name,
        fix: `Use an http://, https:// or discord:// URL for ${name}`,
      });
    }
  }

  /**
   * Checks that a Discord `custom_id` is 1 to 100 characters long.
   *
   * @param customId - Custom ID to validate.
   * @param name - Field name used in the error message.
   * @throws If the custom ID length is invalid.
   */
  protected validateCustomId(customId: string, name = 'customId'): void {
    const len = customId.length;
    if (len < 1) {
      throw componentError(`${name} is too short, need at least 1 character(s) but got 0`, {
        code: 'CUSTOM_ID_LENGTH_INVALID',
        path: name,
        fix: `Use a non-empty ${name} no longer than 100 characters`,
      });
    }
    if (len > 100) {
      throw componentError(`${name} is too long, max is 100 characters but got ${len}`, {
        code: 'CUSTOM_ID_LENGTH_INVALID',
        path: name,
        fix: `Use a non-empty ${name} no longer than 100 characters`,
      });
    }
  }

  /**
   * Checks that a component tree fits inside Discord's per-message limits:
   * at most 40 components and 4000 characters of combined text.
   *
   * @param root - Root component or payload to validate.
   * @throws If the layout or text size exceeds the limits.
   */
  public static validateTreeLimits(root: unknown, context: AuditContext = 'message'): void {
    validateComponentTree(root, context);
  }

  /**
   * Audits a component tree and reports every Discord constraint it violates.
   * Never throws, so it is safe to run on partially built layouts.
   *
   * @param root - Root component or payload to check.
   * @param options - Audit configuration.
   * @returns Structured issues describing each violation.
   */
  public static auditTree(root: unknown, options: { structured: true; context?: AuditContext }): AuditIssue[];
  /**
   * Audits a component tree and reports every Discord constraint it violates.
   * Never throws, so it is safe to run on partially built layouts.
   *
   * @param root - Root component or payload to check.
   * @param options - Audit configuration.
   * @returns One message per violation.
   */
  public static auditTree(root: unknown, options?: { structured?: false; context?: AuditContext }): string[];
  /**
   * Audits a component tree and reports every Discord constraint it violates.
   * Never throws, so it is safe to run on partially built layouts.
   *
   * @param root - Root component or payload to check.
   * @param options - Audit configuration.
   * @returns Messages, or structured issues when `structured` is set.
   */
  public static auditTree(root: unknown, options?: { structured?: boolean; context?: AuditContext }): (string | AuditIssue)[];
  public static auditTree(root: unknown, options?: { structured?: boolean; context?: AuditContext }): (string | AuditIssue)[] {
    return auditComponentTree(root, options);
  }

  /**
   * Creates a deep copy of this builder.
   * Good for reusing layouts or copying buttons and inputs with small tweaks.
   *
   * @returns Cloned builder instance.
   * @throws If the concrete builder has no static `from` method.
   *
   * @example
   * ```ts
   * const nextBtn = baseBtn.clone().setCustomId('next_page').setLabel('Next Page');
   * ```
   */
  clone(): this {
    const ctor = this.constructor as unknown as { from?: (data: unknown) => unknown };
    if (typeof ctor.from === 'function') {
      return ctor.from(structuredClone(this.toJSON())) as this;
    }
    throw componentError(`can't clone component of type ${this.type} because it doesn't have a static from method`, {
      code: 'CLONE_UNSUPPORTED',
      fix: 'Rebuild the component manually instead of cloning it',
    });
  }
}
