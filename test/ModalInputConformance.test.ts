import { describe, expect, it } from 'bun:test';
import {
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  FileUploadBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
} from '../src/index.ts';

describe('modal input conformance', () => {
  it('requires custom IDs before serializing modal inputs', () => {
    const inputs = [
      new CheckboxBuilder(),
      new FileUploadBuilder(),
      new CheckboxGroupBuilder().addOptions(
        new CheckboxGroupOptionBuilder({ value: 'a', label: 'A' }),
        new CheckboxGroupOptionBuilder({ value: 'b', label: 'B' }),
      ),
      new RadioGroupBuilder().addOptions(
        new RadioGroupOptionBuilder({ value: 'a', label: 'A' }),
        new RadioGroupOptionBuilder({ value: 'b', label: 'B' }),
      ),
    ];
    for (const input of inputs) {
      expect(() => input.toJSON()).toThrow('customId');
      input.setCustomId('input');
      expect(input.toJSON().custom_id).toBe('input');
      input.data.custom_id = '';
      expect(() => input.toJSON()).toThrow('customId');
    }
  });

  it('allows a required checkbox group with one option', () => {
    const option = new CheckboxGroupOptionBuilder({ value: 'accept', label: 'Accept' });
    const group = new CheckboxGroupBuilder({ customId: 'terms', required: true, options: [option] });
    expect(group.toJSON().options).toEqual([{ value: 'accept', label: 'Accept' }]);
    expect(group.setOptions([option]).spliceOptions(0, 1, option).toJSON().required).toBe(true);
  });

  it('requires explicit optional uploads before allowing zero files', () => {
    // @ts-expect-error - zero files requires required:false
    expect(() => new FileUploadBuilder({ customId: 'files', minValues: 0 })).toThrow('required is false');
    // @ts-expect-error - raw field aliases obey the same requirement
    expect(() => new FileUploadBuilder({ custom_id: 'files', min_values: 0 })).toThrow('required is false');
    // @ts-expect-error - required:true conflicts with minValues:0
    expect(() => new FileUploadBuilder({ customId: 'files', required: true, minValues: 0 })).toThrow('required is false');
    const upload = new FileUploadBuilder({ customId: 'files' });
    expect(() => upload.setMinValues(0)).toThrow('required is false');
    upload.setRequired(false).setMinValues(0);
    expect(() => upload.setRequired(true)).toThrow('required is false');
    delete upload.data.required;
    expect(() => upload.toJSON()).toThrow('required is false');
  });

  it('round-trips optional uploads including filters and component IDs', () => {
    const raw = {
      type: 19 as const,
      custom_id: 'files',
      required: false,
      min_values: 0,
      max_values: 3,
      file_types: ['image', '.pdf'],
      id: 17,
    };
    expect(FileUploadBuilder.from(raw).toJSON()).toEqual(raw);
  });

  it('round-trips optional checkbox groups with zero selections', () => {
    const raw = {
      type: 22 as const,
      custom_id: 'choices',
      required: false,
      min_values: 0,
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
    };
    expect(CheckboxGroupBuilder.from(raw).toJSON()).toEqual(raw);
  });

  it('accepts file categories and dot-prefixed extensions', () => {
    const upload = new FileUploadBuilder({ customId: 'files', file_types: ['image', 'video', 'audio', '.pdf'] });
    expect(upload.addFileTypes('.png').toJSON().file_types).toEqual(['image', 'video', 'audio', '.pdf', '.png']);
    for (const invalid of ['pdf', 'image/png', '.', '']) {
      expect(() => upload.setFileTypes([invalid])).toThrow('fileTypes');
    }
    upload.data.file_types = ['pdf'];
    expect(() => upload.toJSON()).toThrow('fileTypes');
  });

  it('revalidates file counts and checkbox group limits when public data changes', () => {
    const upload = new FileUploadBuilder({ customId: 'files', minValues: 1, maxValues: 3 });
    upload.data.max_values = 0;
    expect(() => upload.toJSON()).toThrow('maxValues');
    const group = new CheckboxGroupBuilder({
      customId: 'choices',
      options: [new CheckboxGroupOptionBuilder({ value: 'a', label: 'A' }), new CheckboxGroupOptionBuilder({ value: 'b', label: 'B' })],
    });
    group.data.min_values = 0;
    expect(() => group.toJSON()).toThrow('required is false');
  });

  it('revalidates mutable radio and checkbox option strings', () => {
    for (const option of [
      new RadioGroupOptionBuilder({ value: 'a', label: 'A' }),
      new CheckboxGroupOptionBuilder({ value: 'a', label: 'A' }),
    ]) {
      option.data.label = 'a'.repeat(101);
      expect(() => option.toJSON()).toThrow('label');
      option.data.label = 'A';
      option.data.value = 'a'.repeat(101);
      expect(() => option.toJSON()).toThrow('value');
      option.data.value = 'a';
      option.data.description = 'a'.repeat(101);
      expect(() => option.toJSON()).toThrow('description');
    }
  });
});
