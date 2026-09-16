import { componentValidationError } from './ComponentError.ts';
import { MAX_TREE_COMPONENTS, MAX_TREE_TEXT_LENGTH } from './ComponentConstraints.ts';
import type { AuditContext } from './ComponentAudit.ts';

/** Running totals collected while walking a component tree. */
interface TreeLimitsState {
  count: number;
  textLength: number;
  ancestors: WeakSet<object>;
}

/**
 * Accumulates the component count and text length of a component tree.
 *
 * @param node - Builder or raw payload to walk.
 * @param state - Mutable totals carried across the walk.
 */
function scanTreeLimits(node: unknown, state: TreeLimitsState): void {
  if (!node || typeof node !== 'object') return;
  if (state.ancestors.has(node)) throw componentValidationError('COMPONENT_TREE_VALIDATION_FAILED', 'component tree is cyclic');
  state.ancestors.add(node);
  try {
    scanTreeContents(node, state);
  } finally {
    state.ancestors.delete(node);
  }
}

function scanTreeContents(node: object, state: TreeLimitsState): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) scanTreeLimits(node[i], state);
    return;
  }

  let payload = node as Record<string, unknown>;
  if (typeof payload.toJSON === 'function') {
    payload = (payload as unknown as { toJSON(): Record<string, unknown> }).toJSON();
    if (!payload || typeof payload !== 'object') return;
  }

  if (typeof payload.type === 'number') state.count++;

  const content = payload.content;
  if (typeof content === 'string') state.textLength += content.length;
  const label = payload.label;
  if (typeof label === 'string') state.textLength += label.length;
  const description = payload.description;
  if (typeof description === 'string') state.textLength += description.length;
  const placeholder = payload.placeholder;
  if (typeof placeholder === 'string') state.textLength += placeholder.length;
  const value = payload.value;
  if (typeof value === 'string') state.textLength += value.length;
  const title = payload.title;
  if (typeof title === 'string') state.textLength += title.length;

  const components = payload.components;
  if (Array.isArray(components)) {
    for (let i = 0; i < components.length; i++) scanTreeLimits(components[i], state);
  }

  const component = payload.component;
  if (component && typeof component === 'object') scanTreeLimits(component, state);

  const options = payload.options;
  if (Array.isArray(options)) {
    for (let i = 0; i < options.length; i++) scanTreeLimits(options[i], state);
  }

  const items = payload.items;
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) scanTreeLimits(items[i], state);
  }

  const accessory = payload.accessory;
  if (accessory && typeof accessory === 'object') scanTreeLimits(accessory, state);
}

export function validateComponentTree(root: unknown, context: AuditContext = 'message'): void {
  // The message-wide budget does not apply to modals; each modal builder
  // validates its own fields and child count before serialization.
  if (context === 'modal') return;
  const state: TreeLimitsState = { count: 0, textLength: 0, ancestors: new WeakSet<object>() };

  scanTreeLimits(root, state);

  if (state.count > MAX_TREE_COMPONENTS) {
    throw componentValidationError('COMPONENT_TREE_VALIDATION_FAILED', `too many components, discord limit is ${MAX_TREE_COMPONENTS} but got ${state.count}`);
  }
  if (state.textLength > MAX_TREE_TEXT_LENGTH) {
    throw componentValidationError('COMPONENT_TREE_VALIDATION_FAILED', `total text is too long, max ${MAX_TREE_TEXT_LENGTH} characters but got ${state.textLength}`);
  }
}
