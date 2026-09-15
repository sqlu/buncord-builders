import { describe, expect, it } from 'bun:test';
import {
  BaseComponent,
  ButtonBuilder,
  ButtonStyle,
  CheckboxBuilder,
  ComponentType,
  ContainerBuilder,
  FileBuilder,
  LabelBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
  type AuditIssue,
} from '../src/index.ts';

/**
 * Regression coverage for the constraints published at
 * https://docs.discord.com/developers/components/reference
 */
describe('Discord documentation conformance', () => {
  describe('auditTree reads unfurled media items', () => {
    it('does not flag a thumbnail that has a media url', () => {
      const section = new SectionBuilder({
        components: [new TextDisplayBuilder({ content: 'Patch notes' })],
        accessory: new ThumbnailBuilder({ url: 'https://example.com/preview.png' }),
      });

      expect(BaseComponent.auditTree(section)).toEqual([]);
    });

    it('does not flag a file that has an attachment url', () => {
      const container = new ContainerBuilder({
        components: [new FileBuilder({ url: 'attachment://report.pdf' })],
      });

      expect(BaseComponent.auditTree(container)).toEqual([]);
    });

    it('still flags a thumbnail and a file without any url', () => {
      const issues = BaseComponent.auditTree(
        {
          type: ComponentType.Container,
          components: [
            { type: ComponentType.Thumbnail },
            { type: ComponentType.File },
          ],
        },
        { structured: true },
      );

      const codes = issues.map((issue: AuditIssue) => issue.code);
      expect(codes).toContain('THUMBNAIL_MISSING_URL');
      expect(codes).toContain('FILE_MISSING_URL');
    });

    it('flags a section that has no accessory', () => {
      const issues = BaseComponent.auditTree(
        {
          type: ComponentType.Section,
          components: [{ type: ComponentType.TextDisplay, content: 'Alone' }],
        },
        { structured: true },
      );

      expect(issues.some((issue: AuditIssue) => issue.code === 'SECTION_MISSING_ACCESSORY')).toBe(true);
    });

    it('flags a modal without a usable title', () => {
      const issues = BaseComponent.auditTree(
        { custom_id: 'form', title: '', components: [{ type: ComponentType.TextDisplay, content: 'Hi' }] },
        { structured: true },
      );

      expect(issues.some((issue: AuditIssue) => issue.code === 'MODAL_TITLE_LENGTH_INVALID')).toBe(true);
    });

    it('requires an explicitly optional file upload for min_values 0', () => {
      const optional = BaseComponent.auditTree(
        { type: ComponentType.FileUpload, custom_id: 'docs', min_values: 0, required: false },
        { structured: true },
      );
      expect(optional).toEqual([]);

      const conflicting = BaseComponent.auditTree(
        { type: ComponentType.FileUpload, custom_id: 'docs', min_values: 0, required: true },
        { structured: true },
      );
      expect(conflicting.some((issue: AuditIssue) => issue.code === 'FILE_UPLOAD_MIN_ZERO_REQUIRES_OPTIONAL')).toBe(true);
    });

    it('flags radio groups outside 2 to 10 and checkbox groups outside 1 to 10', () => {
      const radio = BaseComponent.auditTree(
        {
          type: ComponentType.RadioGroup,
          custom_id: 'theme',
          options: [{ value: 'dark', label: 'Dark' }],
        },
        { structured: true },
      );
      expect(radio.some((issue: AuditIssue) => issue.code === 'RADIO_GROUP_OPTIONS_LIMIT')).toBe(true);

      const checkbox = BaseComponent.auditTree(
        {
          type: ComponentType.CheckboxGroup,
          custom_id: 'interests',
          options: Array.from({ length: 11 }, (_, i) => ({ value: `v${i}`, label: `L${i}` })),
        },
        { structured: true },
      );
      expect(checkbox.some((issue: AuditIssue) => issue.code === 'CHECKBOX_GROUP_OPTIONS_LIMIT')).toBe(true);
    });

    it('flags a file upload with more than 10 file types', () => {
      const issues = BaseComponent.auditTree(
        {
          type: ComponentType.FileUpload,
          custom_id: 'docs',
          file_types: Array.from({ length: 11 }, (_, i) => `ext${i}`),
        },
        { structured: true },
      );

      expect(issues.some((issue: AuditIssue) => issue.code === 'FILE_UPLOAD_FILE_TYPES_LIMIT')).toBe(true);
    });
  });

  describe('required fields are enforced at serialization time', () => {
    it('refuses to serialize a Label without a label', () => {
      const label = new LabelBuilder().setComponent(new CheckboxBuilder({ customId: 'tos' }));
      expect(() => label.toJSON()).toThrow('label is required');
    });

    it('refuses to serialize a Label without a component', () => {
      const label = new LabelBuilder({ label: 'Terms' });
      expect(() => label.toJSON()).toThrow('component is required');
    });

    it('refuses to serialize a modal without a title or a customId', () => {
      const withoutTitle = new ModalBuilder({ customId: 'form' }).addComponents(
        new TextDisplayBuilder({ content: 'Hello' }),
      );
      expect(() => withoutTitle.toJSON()).toThrow('title is required');

      const withoutCustomId = new ModalBuilder({ title: 'Form' }).addComponents(
        new TextDisplayBuilder({ content: 'Hello' }),
      );
      expect(() => withoutCustomId.toJSON()).toThrow('customId is required');
    });

    it('rejects an empty modal title', () => {
      expect(() => new ModalBuilder({ customId: 'form' }).setTitle('')).toThrow('title is required');
    });
  });

  describe('serialization has no side effects and no undefined holes', () => {
    it('does not mutate the builder when serializing a button', () => {
      const button = new ButtonBuilder({ customId: 'click', label: 'Click' });
      expect(button.style).toBe(ButtonStyle.Primary);

      const payload = button.toJSON();
      expect(Object.keys(payload).sort()).toEqual(['custom_id', 'label', 'style', 'type']);
    });

    it('omits unset fields from a select-menu-free separator payload', () => {
      const separator = new SeparatorBuilder();
      expect(Object.keys(separator.toJSON())).toEqual(['type']);
    });

    it('keeps the id accessor and the raw payload in sync', () => {
      const text = new TextDisplayBuilder({ content: 'Hello' });
      expect(text.id).toBeUndefined();

      text.id = 7;
      expect(text.toJSON().id).toBe(7);

      text.id = undefined;
      expect('id' in text.toJSON()).toBe(false);

      text.setId(9);
      expect(text.toJSON().id).toBe(9);
      expect(() => { text.id = -1; }).toThrow('32-bit unsigned integer');

      text.clearId();
      expect(text.toJSON().id).toBeUndefined();
    });
  });

  describe('media urls follow the unfurled media item limits', () => {
    const longUrl = `https://example.com/${'a'.repeat(2048)}.png`;

    it('accepts a url longer than 512 characters', () => {
      const url = `https://example.com/${'a'.repeat(600)}.png`;
      expect(new ThumbnailBuilder({ url }).url).toBe(url);
      expect(new MediaGalleryItemBuilder({ url }).url).toBe(url);
    });

    it('rejects a url longer than 2048 characters', () => {
      expect(() => new ThumbnailBuilder({ url: longUrl })).toThrow('max is 2048 characters');
      expect(() => new MediaGalleryItemBuilder({ url: longUrl })).toThrow('max is 2048 characters');
    });

    it('rejects a file url that is not an attachment reference', () => {
      expect(() => new FileBuilder({ url: 'https://example.com/report.pdf' as never })).toThrow(
        'attachment:// scheme',
      );
    });
  });

  describe('layout containers reject children Discord does not allow', () => {
    it('rejects a Thumbnail inside a Container', () => {
      const thumbnail = new ThumbnailBuilder({ url: 'https://example.com/a.png' });
      expect(() => new ContainerBuilder().addComponents(thumbnail as never)).toThrow(
        'is not allowed inside a Container',
      );
    });

    it('rejects a non TextDisplay child inside a Section', () => {
      const separator = new SeparatorBuilder();
      expect(() => new SectionBuilder().addTextDisplayComponents(separator as never)).toThrow(
        'Section can only contain TextDisplay components',
      );
    });
  });

  describe('option groups enforce their documented minimums', () => {
    it('throws for a radio group and a checkbox group with too few options', async () => {
      const { RadioGroupBuilder, CheckboxGroupBuilder } = await import('../src/index.ts');

      expect(() => new RadioGroupBuilder({ customId: 'theme' }).toJSON()).toThrow(
        'options needs between 2 and 10 elements',
      );
      expect(() => new CheckboxGroupBuilder({ customId: 'interests' }).toJSON()).toThrow(
        'options needs between 1 and 10 elements',
      );
    });
  });

  describe('text input values respect the configured bounds', () => {
    it('rejects a value shorter than minLength or longer than maxLength', () => {
      const input = new TextInputBuilder({
        customId: 'bio',
        style: TextInputStyle.Paragraph,
        minLength: 5,
        maxLength: 10,
      });

      expect(() => input.setValue('abc')).toThrow('value is too short');
      expect(() => input.setValue('a'.repeat(11))).toThrow('value is too long');
      expect(input.setValue('abcdef').value).toBe('abcdef');
    });
  });
});
