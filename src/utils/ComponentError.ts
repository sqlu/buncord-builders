/**
 * Machine readable identifier carried by a thrown validation error.
 *
 * Codes that also exist in {@link AuditIssue} are spelled identically on
 * purpose: a rule reported by `auditTree()` and the same rule thrown by
 * `toJSON()` must be recognisable by the same string.
 */
export type ComponentErrorCode =
  // Shared by the validation helpers on BaseComponent.
  | 'STRING_TOO_LONG'
  | 'STRING_TOO_SHORT'
  | 'VALUE_OUT_OF_RANGE'
  | 'ARRAY_LENGTH_INVALID'
  | 'INVALID_URL_SCHEME'
  | 'CLONE_UNSUPPORTED'
  // Shared with the auditor.
  | 'CUSTOM_ID_LENGTH_INVALID'
  | 'INVALID_COMPONENT_ID'
  | 'SECTION_MISSING_ACCESSORY'
  | 'SECTION_ACCESSORY_INVALID_TYPE'
  | 'SECTION_INVALID_CHILD_TYPE'
  | 'CONTAINER_CHILD_INVALID_TYPE'
  | 'LABEL_INVALID_CHILD_TYPE'
  | 'LABEL_LABEL_REQUIRED'
  | 'LABEL_COMPONENT_REQUIRED'
  | 'MODAL_TITLE_LENGTH_INVALID'
  | 'MODAL_CUSTOM_ID_REQUIRED'
  | 'MODAL_COMPONENTS_LIMIT'
  | 'SELECT_MENU_MIN_ZERO_REQUIRES_OPTIONAL'
  | 'SELECT_MENU_MIN_EXCEEDS_MAX'
  | 'SELECT_DEFAULT_VALUE_TYPE_INVALID'
  | 'FILE_UPLOAD_MIN_ZERO_REQUIRES_OPTIONAL'
  | 'FILE_UPLOAD_MIN_EXCEEDS_MAX'
  | 'CHECKBOX_GROUP_MIN_ZERO_REQUIRES_OPTIONAL'
  | 'CHECKBOX_GROUP_MIN_EXCEEDS_MAX'
  // Stable fallbacks for builder-specific rules that have no auditor twin.
  | 'ACTION_ROW_VALIDATION_FAILED'
  | 'BUTTON_VALIDATION_FAILED'
  | 'CHECKBOX_VALIDATION_FAILED'
  | 'CHECKBOX_GROUP_VALIDATION_FAILED'
  | 'CONTAINER_VALIDATION_FAILED'
  | 'FILE_VALIDATION_FAILED'
  | 'FILE_UPLOAD_VALIDATION_FAILED'
  | 'LABEL_VALIDATION_FAILED'
  | 'MEDIA_GALLERY_VALIDATION_FAILED'
  | 'MODAL_VALIDATION_FAILED'
  | 'RADIO_GROUP_VALIDATION_FAILED'
  | 'SECTION_VALIDATION_FAILED'
  | 'SELECT_MENU_VALIDATION_FAILED'
  | 'SMART_LAYOUT_VALIDATION_FAILED'
  | 'TEXT_DISPLAY_VALIDATION_FAILED'
  | 'TEXT_INPUT_VALIDATION_FAILED'
  | 'THUMBNAIL_VALIDATION_FAILED'
  | 'COMPONENT_FACTORY_ERROR'
  | 'COMPONENT_TREE_VALIDATION_FAILED'
  | 'OPTION_VALIDATION_FAILED';

/** Extra context attached to a thrown validation error. */
export interface ComponentErrorDetails {
  /** Stable identifier for the rule that failed. */
  code: ComponentErrorCode;
  /** Dotted path to the offending component, when the thrower knows it. */
  path?: string;
  /** Actionable hint describing how to resolve the problem. */
  fix?: string;
}

/**
 * An `Error` carrying the identifier of the rule that rejected the payload.
 *
 * It is a plain `Error`, not a subclass, and its extra fields are
 * non-enumerable. `instanceof Error`, `constructor === Error`, `Object.keys()`
 * and `JSON.stringify()` retain their usual behavior for ordinary consumers.
 */
export interface ComponentError extends Error {
  /** Stable identifier for the rule that failed. */
  readonly code: ComponentErrorCode;
  /** Dotted path to the offending component, when known. */
  readonly path?: string;
  /** Actionable hint describing how to resolve the problem. */
  readonly fix?: string;
}

const COMPONENT_ERROR_BRAND = Symbol.for('@buncord/builders.ComponentError');

/**
 * Builds a validation error that carries its rule identifier.
 *
 * @param message - The human readable message, unchanged from a plain `Error`.
 * @param details - The rule identifier and optional context.
 * @returns An `Error` with non-enumerable `code`, `path` and `fix` fields.
 *
 * @example
 * ```ts
 * try {
 *   button.setLabel('x'.repeat(200));
 * } catch (err) {
 *   if (isComponentError(err) && err.code === 'STRING_TOO_LONG') retryShorter();
 * }
 * ```
 */
export function componentError(message: string, details: ComponentErrorDetails): ComponentError {
  const error = new Error(message);

  // Non-enumerable so the error serializes and enumerates like any other Error.
  Object.defineProperty(error, COMPONENT_ERROR_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(error, 'code', {
    value: details.code,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  if (details.path !== undefined) {
    Object.defineProperty(error, 'path', {
      value: details.path,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  if (details.fix !== undefined) {
    Object.defineProperty(error, 'fix', {
      value: details.fix,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }

  return error as ComponentError;
}

/**
 * Creates a structured component error for a rule without a dedicated auditor
 * code. Keeping the code at the call site makes the owning subsystem explicit.
 */
export function componentValidationError(code: ComponentErrorCode, message: string): ComponentError {
  return componentError(message, { code });
}

/**
 * Narrows an unknown caught value to a {@link ComponentError}.
 *
 * @param value - The caught value.
 * @returns Whether the value is an `Error` carrying a rule identifier.
 */
export function isComponentError(value: unknown): value is ComponentError {
  return value instanceof Error
    && (value as unknown as Record<symbol, unknown>)[COMPONENT_ERROR_BRAND] === true
    && typeof (value as { code?: unknown }).code === 'string';
}
