import { describe, it, expect } from 'bun:test';
import {
  ButtonBuilder,
  ButtonStyle,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  BaseComponent,
  ComponentType,
  ComponentFactory,
} from '../src/index.ts';

// Ce fichier couvre les lignes restantes non couvertes après la refactorisation
// des constructeurs optionnels. Chaque describe cible une zone précise du rapport
// de couverture.

describe('FinalCoverage', () => {

  // ─── ButtonBuilder ──────────────────────────────────────────────────────────

  describe('ButtonBuilder.setEmoji', () => {
    it('sets an emoji on the button', () => {
      const btn = new ButtonBuilder({ customId: 'btn', style: ButtonStyle.Primary, label: 'Go' });
      btn.setEmoji({ name: '🚀' });
      expect(btn.toJSON().emoji).toEqual({ name: '🚀' });
    });

    it('sets an emoji with id and animated flag', () => {
      const btn = new ButtonBuilder({ customId: 'btn2', style: ButtonStyle.Secondary });
      btn.setEmoji({ id: '123456789', name: 'fire', animated: true });
      const json = btn.toJSON();
      expect(json.emoji).toEqual({ id: '123456789', name: 'fire', animated: true });
    });
  });

  // ─── CheckboxGroupOptionBuilder setters ─────────────────────────────────────

  describe('CheckboxGroupOptionBuilder fluent setters', () => {
    it('setValue sets the value', () => {
      const opt = new CheckboxGroupOptionBuilder({ label: 'L' });
      opt.setValue('my_value');
      const json = opt.toJSON();
      expect(json.value).toBe('my_value');
    });

    it('setValue throws if empty string', () => {
      const opt = new CheckboxGroupOptionBuilder();
      expect(() => opt.setValue('')).toThrow('value needs to be at least 1 character');
    });

    it('setValue throws if exceeds 100 chars', () => {
      const opt = new CheckboxGroupOptionBuilder();
      expect(() => opt.setValue('a'.repeat(101))).toThrow('value is too long, max is 100 characters');
    });

    it('setLabel sets the label', () => {
      const opt = new CheckboxGroupOptionBuilder({ value: 'v' });
      opt.setLabel('My Label');
      expect(opt.toJSON().label).toBe('My Label');
    });

    it('setLabel throws if exceeds 100 chars', () => {
      const opt = new CheckboxGroupOptionBuilder();
      expect(() => opt.setLabel('a'.repeat(101))).toThrow('label is too long, max is 100 characters');
    });

    it('setDescription sets the description', () => {
      const opt = new CheckboxGroupOptionBuilder({ value: 'v', label: 'L' });
      opt.setDescription('my desc');
      expect(opt.toJSON().description).toBe('my desc');
    });

    it('setDescription throws if exceeds 100 chars', () => {
      const opt = new CheckboxGroupOptionBuilder({ value: 'v', label: 'L' });
      expect(() => opt.setDescription('a'.repeat(101))).toThrow('description is too long, max is 100 characters');
    });
  });

  // ─── RadioGroupOptionBuilder setters ────────────────────────────────────────

  describe('RadioGroupOptionBuilder fluent setters', () => {
    it('setValue sets the value', () => {
      const opt = new RadioGroupOptionBuilder({ label: 'L' });
      opt.setValue('radio_val');
      expect(opt.toJSON().value).toBe('radio_val');
    });

    it('setValue throws if empty string', () => {
      const opt = new RadioGroupOptionBuilder();
      expect(() => opt.setValue('')).toThrow('value needs to be at least 1 character');
    });

    it('setValue throws if exceeds 100 chars', () => {
      const opt = new RadioGroupOptionBuilder();
      expect(() => opt.setValue('x'.repeat(101))).toThrow('value is too long, max is 100 characters');
    });

    it('setLabel sets the label', () => {
      const opt = new RadioGroupOptionBuilder({ value: 'v' });
      opt.setLabel('Radio Label');
      expect(opt.toJSON().label).toBe('Radio Label');
    });

    it('setLabel throws if exceeds 100 chars', () => {
      const opt = new RadioGroupOptionBuilder();
      expect(() => opt.setLabel('b'.repeat(101))).toThrow('label is too long, max is 100 characters');
    });
  });

  // ─── StringSelectMenuOptionBuilder setters ───────────────────────────────────

  describe('StringSelectMenuOptionBuilder fluent setters', () => {
    it('setLabel sets the label', () => {
      const opt = new StringSelectMenuOptionBuilder({ label: 'Initial', value: 'v' });
      opt.setLabel('Updated');
      expect(opt.toJSON().label).toBe('Updated');
    });

    it('setLabel throws if exceeds 100 chars', () => {
      const opt = new StringSelectMenuOptionBuilder({ label: 'ok', value: 'v' });
      expect(() => opt.setLabel('a'.repeat(101))).toThrow('label is too long, max is 100 characters');
    });

    it('setValue sets the value', () => {
      const opt = new StringSelectMenuOptionBuilder({ label: 'L', value: 'old' });
      opt.setValue('new_val');
      expect(opt.toJSON().value).toBe('new_val');
    });

    it('setValue throws if empty', () => {
      const opt = new StringSelectMenuOptionBuilder({ label: 'L', value: 'v' });
      expect(() => opt.setValue('')).toThrow('value needs to be at least 1 character');
    });

    it('setValue throws if exceeds 100 chars', () => {
      const opt = new StringSelectMenuOptionBuilder({ label: 'L', value: 'v' });
      expect(() => opt.setValue('z'.repeat(101))).toThrow('value is too long, max is 100 characters');
    });
  });

  // ─── MediaGalleryBuilder.addItems ───────────────────────────────────────────

  describe('MediaGalleryBuilder.addItems', () => {
    it('adds items to an empty gallery', () => {
      const gallery = new MediaGalleryBuilder();
      const item1 = new MediaGalleryItemBuilder({ url: 'https://example.com/1.jpg' });
      const item2 = new MediaGalleryItemBuilder({ url: 'https://example.com/2.jpg' });
      gallery.addItems(item1, item2);
      expect(gallery.items.length).toBe(2);
    });

    it('adds items to a pre-populated gallery', () => {
      const item1 = new MediaGalleryItemBuilder({ url: 'https://example.com/1.jpg' });
      const item2 = new MediaGalleryItemBuilder({ url: 'https://example.com/2.jpg' });
      const gallery = new MediaGalleryBuilder({ items: [item1] });
      gallery.addItems(item2);
      expect((gallery.items as unknown[]).length).toBe(2);
    });

    it('throws if adding would exceed 10 items', () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        new MediaGalleryItemBuilder({ url: `https://example.com/${i}.jpg` }),
      );
      const gallery = new MediaGalleryBuilder({ items });
      const extra = new MediaGalleryItemBuilder({ url: 'https://example.com/extra.jpg' });
      expect(() => gallery.addItems(extra)).toThrow("items size can't be more than 10");
    });
  });

  // ─── SectionBuilder.addTextDisplayComponents ─────────────────────────────────

  describe('SectionBuilder.addTextDisplayComponents', () => {
    it('adds text display components to an empty section', () => {
      const sec = new SectionBuilder();
      const t1 = new TextDisplayBuilder({ content: 'Hello' });
      const t2 = new TextDisplayBuilder({ content: 'World' });
      sec.addTextDisplayComponents(t1, t2);
      expect(sec.components.length).toBe(2);
    });

    it('adds to an existing component list', () => {
      const t1 = new TextDisplayBuilder({ content: 'A' });
      const t2 = new TextDisplayBuilder({ content: 'B' });
      const sec = new SectionBuilder({ components: [t1] });
      sec.addTextDisplayComponents(t2);
      expect((sec.components as unknown[]).length).toBe(2);
    });

    it('throws if adding would exceed 3 components', () => {
      const t = () => new TextDisplayBuilder({ content: 'X' });
      const sec = new SectionBuilder({ components: [t(), t(), t()] });
      expect(() => sec.addTextDisplayComponents(t())).toThrow("can't have more than 3 components here");
    });
  });

  // ─── SelectMenuBuilders – protected base methods via subclass ────────────────

  describe('BaseSelectMenu protected initCommon and initAuto', () => {
    // We expose these via a concrete subclass to exercise the protected methods directly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TestAutoSelectMenu = class extends (UserSelectMenuBuilder as any) {
      callInitCommon(
        cid: string,
        placeholder: string | undefined,
        min: number | undefined,
        max: number | undefined,
        disabled: boolean | undefined,
        required: boolean | undefined,
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).initCommon(cid, placeholder, min, max, disabled, required);
      }
      callInitAuto(opts: Record<string, unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).initAuto(opts);
      }
    };

    it('initCommon sets all fields correctly', () => {
      const menu = new TestAutoSelectMenu();
      menu.callInitCommon('my_id', 'Pick one', 1, 5, false, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (menu as any).toJSON();
      expect(json.custom_id).toBe('my_id');
      expect(json.placeholder).toBe('Pick one');
      expect(json.min_values).toBe(1);
      expect(json.max_values).toBe(5);
      expect(json.disabled).toBe(false);
      expect(json.required).toBe(true);
    });

    it('initCommon throws if customId is empty', () => {
      const menu = new TestAutoSelectMenu();
      expect(() => menu.callInitCommon('', undefined, undefined, undefined, undefined, undefined)).toThrow();
    });

    it('initCommon throws if customId exceeds 100 chars', () => {
      const menu = new TestAutoSelectMenu();
      expect(() => menu.callInitCommon('a'.repeat(101), undefined, undefined, undefined, undefined, undefined)).toThrow();
    });

    it('initAuto extracts customId and delegates to initCommon', () => {
      const menu = new TestAutoSelectMenu();
      menu.callInitAuto({ customId: 'test_auto', placeholder: 'Auto test' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (menu as any).toJSON();
      expect(json.custom_id).toBe('test_auto');
      expect(json.placeholder).toBe('Auto test');
    });

    it('initAuto throws if no customId provided', () => {
      const menu = new TestAutoSelectMenu();
      expect(() => menu.callInitAuto({})).toThrow('customId is required');
    });

    it('initAuto uses custom_id alias', () => {
      const menu = new TestAutoSelectMenu();
      menu.callInitAuto({ custom_id: 'alias_id' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((menu as any).toJSON().custom_id).toBe('alias_id');
    });
  });


  // ─── src/index.ts Bun runtime guard ─────────────────────────────────────────
  // Le guard "if (typeof Bun === 'undefined') throw" ne peut pas être couvert via
  // un import normal dans Bun. On vérifie qu'il est là dans le source et qu'il
  // protège bien le runtime. Ce comportement est testé implicitement par le fait
  // que tous les imports de '../src/index.ts' réussissent dans l'environnement Bun.
  // La ligne 1-4 de src/index.ts est une dead branch dans le runtime Bun ;
  // on la documente ici plutôt que de tester l'impossible.

  // ─── factory.ts – ComponentFactory constructor ───────────────────────────────

  describe('ComponentFactory constructor', () => {
    it('can be instantiated (unused but fulfills function coverage)', () => {
      // La classe ComponentFactory n'est utilisée qu'en statique, mais le
      // constructeur implicite doit être couvert.
      const factory = new ComponentFactory();
      expect(factory).toBeInstanceOf(ComponentFactory);
    });
  });

  // ─── base.ts – clone() error branch ─────────────────────────────────────────

  describe('BaseComponent.clone error branch', () => {
    it('throws if builder has no static from() method', () => {
      class NoFromBuilder extends BaseComponent {
        public override readonly type = ComponentType.Separator;
        toJSON() { return { type: this.type }; }
      }
      const b = new NoFromBuilder();
      expect(() => b.clone()).toThrow("can't clone component of type");
    });
  });

  // ─── CheckboxGroupBuilder – empty constructor ─────────────────────────────────

  describe('CheckboxGroupBuilder no-args constructor', () => {
    it('creates an empty builder without args', () => {
      const b = new CheckboxGroupBuilder();
      expect(b.customId).toBeUndefined();
    });

    it('creates an empty builder with {}', () => {
      const b = new CheckboxGroupBuilder({});
      expect(b.customId).toBeUndefined();
    });
  });

  // ─── RadioGroupBuilder – empty constructor ─────────────────────────────────

  describe('RadioGroupBuilder no-args constructor', () => {
    it('creates an empty builder without args', () => {
      const b = new RadioGroupBuilder();
      expect(b.customId).toBeUndefined();
    });
  });

  // ─── UserSelectMenuBuilder – no-args constructor ─────────────────────────────

  describe('UserSelectMenuBuilder no-args constructor', () => {
    it('creates an empty builder without args', () => {
      const b = new UserSelectMenuBuilder();
      expect(b.customId).toBeUndefined();
    });
  });

  // ─── auditTree – toJSON throws path ──────────────────────────────────────────

  describe('BaseComponent.auditTree toJSON throws branch', () => {
    it('reports a warning when toJSON throws and falls back to .data', () => {
      const broken = {
        type: ComponentType.Button,
        data: { type: ComponentType.Button, custom_id: 'btn', style: 1, label: 'X' },
        toJSON() { throw new Error('toJSON failed intentionally'); },
      };
      const issues = BaseComponent.auditTree(broken, { structured: true });
      // Should report TOJSON_FAILED warning and still continue scan
      expect(issues.some(i => i.code === 'TOJSON_FAILED')).toBe(true);
    });
  });

  // ─── auditTree – context: 'modal' flag ────────────────────────────────────────

  describe('BaseComponent.auditTree context modal', () => {
    it('accepts context modal option', () => {
      const payload = {
        type: ComponentType.TextInput,
        custom_id: 'txt',
        style: 1,
        min_length: 5,
        max_length: 3,
      };
      const issues = BaseComponent.auditTree(payload, { structured: true, context: 'modal' });
      expect(issues.some(i => i.code === 'TEXT_INPUT_MIN_EXCEEDS_MAX')).toBe(true);
    });
  });

  // ─── SectionBuilder.from – covers inner map arrow ────────────────────────────

  describe('SectionBuilder.from', () => {
    it('deserializes a section with components and accessory', () => {
      const raw = {
        type: ComponentType.Section,
        components: [
          { type: ComponentType.TextDisplay, content: 'Hello from section' },
        ],
        accessory: {
          type: ComponentType.Button,
          custom_id: 'sec_btn',
          style: 1,
          label: 'Go',
        },
      };
      const sec = SectionBuilder.from(raw as Parameters<typeof SectionBuilder.from>[0]);
      expect(sec.components.length).toBe(1);
      expect(sec.accessory).toBeDefined();
    });

    it('deserializes a section without components or accessory', () => {
      const raw = {
        type: ComponentType.Section,
        components: [],
      };
      const sec = SectionBuilder.from(raw as Parameters<typeof SectionBuilder.from>[0]);
      expect(sec.components.length).toBe(0);
    });
  });

  // ─── SectionBuilder.setButtonAccessory and setThumbnailAccessory ──────────────

  describe('SectionBuilder accessory setters', () => {
    it('setButtonAccessory delegates to setAccessory', () => {
      const sec = new SectionBuilder({ components: [new TextDisplayBuilder({ content: 'Hi' })] });
      const btn = new ButtonBuilder({ customId: 'b', style: ButtonStyle.Primary, label: 'B' });
      sec.setButtonAccessory(btn);
      expect(sec.accessory).toBe(btn);
    });

    it('setThumbnailAccessory delegates to setAccessory', () => {
      const sec = new SectionBuilder({ components: [new TextDisplayBuilder({ content: 'Hi' })] });
      const thumb = new ThumbnailBuilder({ url: 'https://example.com/img.jpg' });
      sec.setThumbnailAccessory(thumb);
      expect(sec.accessory).toBe(thumb);
    });
  });

  // ─── base.ts – scanTreeLimits file/media/files branches ───────────────────────

  describe('BaseComponent scanTreeLimits deeper branches', () => {
    it('traverses file, media, and files fields in validateTreeLimits', () => {
      // Exercice de la branche files[] dans scanTreeLimits
      const payload = {
        type: ComponentType.FileUpload,
        files: [
          { type: ComponentType.File, url: 'attachment://doc.pdf', label: 'Doc' },
        ],
        file: { type: ComponentType.File, url: 'attachment://img.png', label: 'Img' },
        media: { type: ComponentType.Thumbnail, url: 'https://example.com/img.jpg' },
      };
      const issues = BaseComponent.auditTree(payload, { structured: true });
      // pas d'erreurs attendues – juste vérifier que ça ne crashe pas
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('RadioGroupBuilder & CheckboxGroupBuilder setOptions coverage', () => {
    it('sets options on RadioGroupBuilder', () => {
      const rg = new RadioGroupBuilder();
      const opt1 = new RadioGroupOptionBuilder({ label: 'A', value: 'a' });
      const opt2 = new RadioGroupOptionBuilder({ label: 'B', value: 'b' });
      rg.setOptions([opt1, opt2]);
      expect(rg.options.length).toBe(2);
    });

    it('sets options on CheckboxGroupBuilder', () => {
      const cg = new CheckboxGroupBuilder();
      const opt1 = new CheckboxGroupOptionBuilder({ label: 'A', value: 'a' });
      const opt2 = new CheckboxGroupOptionBuilder({ label: 'B', value: 'b' });
      cg.setOptions([opt1, opt2]);
      expect(cg.options.length).toBe(2);
    });
  });
});

