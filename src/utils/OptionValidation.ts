/** Common sendable fields of select, radio and checkbox options. */
export interface OptionFields {
  label?: string;
  value?: string;
  description?: string;
}

/** Validates raw and builder-owned options without changing their payload. */
export function validateOptionFields(option: OptionFields): void {
  if (!option || typeof option.label !== 'string' || !option.label)
    throw new Error('label is required');
  if (typeof option.value !== 'string' || !option.value)
    throw new Error('value is required');
  if (option.label.length > 100) throw new Error('label is too long, max is 100 characters');
  if (option.value.length > 100) throw new Error('value is too long, max is 100 characters');
  if (option.description !== undefined &&
      (typeof option.description !== 'string' || option.description.length > 100))
    throw new Error('description must be a string of at most 100 characters');
}
