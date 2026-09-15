import { describe, it, expect } from 'bun:test';
import { FileUploadBuilder } from '../src/index.ts';

describe('FileUploadBuilder', () => {
  it('creates a basic FileUpload component', () => {
    const builder = new FileUploadBuilder({ customId: 'my_uploader' });
    const json = builder.toJSON();
    expect(json.type).toBe(19);
    expect(json.custom_id).toBe('my_uploader');
  });

  it('supports minValues and maxValues options', () => {
    const builder = new FileUploadBuilder({
      customId: 'upload',
      minValues: 2,
      maxValues: 5,
      required: true,
    });
    const json = builder.toJSON();
    expect(json.min_values).toBe(2);
    expect(json.max_values).toBe(5);
    expect(json.required).toBe(true);
  });

  it('throws on invalid minValues and maxValues bounds', () => {
    expect(() =>
      // @ts-expect-error
      new FileUploadBuilder({
        customId: 'x',
        minValues: 3,
        maxValues: 2,
      }),
    ).toThrow("minValues can't be more than maxValues");

    expect(() =>
      new FileUploadBuilder({
        customId: 'x',
        // @ts-expect-error
        minValues: -1,
      }),
    ).toThrow('between 0 and 10');

    expect(() =>
      // @ts-expect-error - zero files conflicts with required:true
      new FileUploadBuilder({
        customId: 'x',
        required: true,
        minValues: 0,
      }),
    ).toThrow('required is false');

    expect(() =>
      new FileUploadBuilder({
        customId: 'x',
        // @ts-expect-error - maxValues > 10 is blocked at compile time
        maxValues: 11,
      }),
    ).toThrow('between 1 and 10');
  });

  it('allows zero minValues when required is false', () => {
    const builder = new FileUploadBuilder({
      customId: 'optional_upload',
      required: false,
      minValues: 0,
    });
    expect(builder.toJSON().min_values).toBe(0);
    expect(builder.toJSON().required).toBe(false);
  });

  // Discord defaults `required` to true on file uploads.
  // https://docs.discord.com/developers/components/reference#file-upload
  it('rejects zero minValues when required is left unset', () => {
    // @ts-expect-error - zero files requires required:false
    expect(() => new FileUploadBuilder({ customId: 'optional_upload', minValues: 0 })).toThrow('required is false');
  });

  it('restricts uploads to a list of file extensions', () => {
    const builder = new FileUploadBuilder({
      customId: 'avatar',
      fileTypes: ['.png', '.jpg'],
    }).addFileTypes('.webp');

    expect(builder.fileTypes).toEqual(['.png', '.jpg', '.webp']);
    expect(builder.toJSON().file_types).toEqual(['.png', '.jpg', '.webp']);

    expect(() => builder.setFileTypes(Array.from({ length: 11 }, (_, i) => `ext${i}`))).toThrow(
      "fileTypes can't have more than 10 entries",
    );
    expect(() => builder.setFileTypes(['.png', ''])).toThrow('must be a non-empty file extension');

    builder.clearFileTypes();
    expect(builder.toJSON().file_types).toBeUndefined();
  });

  it('supports fluid setting methods', () => {
    const builder = new FileUploadBuilder({ customId: 'x' })
      .setCustomId('new_id')
      .setMinValues(1)
      .setMaxValues(4)
      .setRequired(false);
    const json = builder.toJSON();
    expect(json.custom_id).toBe('new_id');
    expect(json.min_values).toBe(1);
    expect(json.max_values).toBe(4);
    expect(json.required).toBe(false);
  });
});
