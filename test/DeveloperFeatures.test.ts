import { describe, it, expect } from 'bun:test';
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  BaseComponent,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  StringSelectMenuBuilder,
  SectionBuilder,
  UserSelectMenuBuilder,
  MessageFlags,
  ComponentType,
  SelectMenuDefaultValueType,
  type SectionAccessory,
  type AuditIssue,
} from '../src/index.ts';

describe('Developer Features', () => {
  describe('Discord constants', () => {
    it('exports the official Components V2 message flag', () => {
      expect(MessageFlags.IsComponentsV2).toBe(1 << 15);
    });

    it('includes official non-bot component type values as enum-only entries', () => {
      expect(ComponentType.ContentInventoryEntry).toBe(16);
      expect(ComponentType.CheckpointCard).toBe(20);
    });

    it('exports SelectMenuDefaultValueType enum', () => {
      expect(SelectMenuDefaultValueType.User as string).toBe('user');
      expect(SelectMenuDefaultValueType.Role as string).toBe('role');
      expect(SelectMenuDefaultValueType.Channel as string).toBe('channel');
    });
  });

  describe('clone() deep copying', () => {
    it('should clone component builder correctly', () => {
      const btn = new ButtonBuilder({
        customId: 'btn1',
        style: ButtonStyle.Primary,
        label: 'Original',
      });
      const copy = btn.clone();
      expect(copy).not.toBe(btn);
      expect(copy.label).toBe('Original');

      // Mutate clone and assert original is unchanged
      copy.setLabel('Cloned');
      expect(copy.label).toBe('Cloned');
      expect(btn.label).toBe('Original');
    });

    it('should clone modal builder correctly', () => {
      const modal = new ModalBuilder({
        customId: 'm1',
        title: 'Original Modal',
        components: [
          new LabelBuilder({
            label: 'Field',
            component: new TextInputBuilder({ customId: 'input_field', label: 'Field' }),
          }),
        ],
      });
      const copy = modal.clone();
      expect(copy).not.toBe(modal);
      expect(copy.title).toBe('Original Modal');

      copy.setTitle('Cloned Modal');
      expect(copy.title).toBe('Cloned Modal');
      expect(modal.title).toBe('Original Modal');
    });
  });

  describe('auditTree() layout compliance', () => {
    it('should return no warnings for a fully compliant container', () => {
      const container = new ContainerBuilder({
        components: [new TextDisplayBuilder({ content: 'Acceptable size' })],
      });
      const warnings = BaseComponent.auditTree(container);
      expect(warnings).toEqual([]);
    });

    it('should detect when component count exceeds 40 components', () => {
      const comps: TextDisplayBuilder[] = [];
      for (let i = 0; i < 41; i++) {
        comps.push(new TextDisplayBuilder({ content: 'A' }));
      }
      const payload = {
        type: 17,
        components: comps.map((c) => c.toJSON()),
      };
      const warnings = BaseComponent.auditTree(payload);
      expect(warnings.length).toBe(2);
      expect(warnings.join(', ')).toContain('Component count (42) exceeds Discord limit of 40 components');
    });

    it('should detect when cumulative text length exceeds 4000 characters', () => {
      const payload = {
        type: 17,
        components: [
          { type: 10, content: 'A'.repeat(2500) },
          { type: 10, content: 'A'.repeat(2500) },
        ],
      };
      const warnings = BaseComponent.auditTree(payload);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('Cumulative text length (5000) exceeds Discord limit of 4000 characters');
    });

    it('should detect duplicate custom IDs', () => {
      const payload = {
        type: 17,
        components: [
          { type: 2, style: 1, label: 'Btn 1', custom_id: 'duplicate_id' },
          { type: 2, style: 1, label: 'Btn 2', custom_id: 'duplicate_id' },
        ],
      };
      const warnings = BaseComponent.auditTree(payload);
      expect(warnings).toContain('Duplicate customId "duplicate_id" found in component tree');
    });

    it('should check link button constraints', () => {
      const payload = {
        type: 2,
        style: 5,
        custom_id: 'bad_link',
      };
      const warnings = BaseComponent.auditTree(payload);
      expect(warnings).toContain('Button with style Link (5) must have a url property');
      expect(warnings).toContain('Button with style Link (5) must not have a customId or custom_id property');
    });

    it('should support structured audit results with paths, fixes, and error codes', () => {
      const payload = {
        type: 1, // ActionRow
        components: [
          {
            type: 2, // Button
            style: 5, // Link
            custom_id: 'bad_link',
          }
        ]
      };
      const issues = BaseComponent.auditTree(payload, { structured: true });
      expect(issues.length).toBe(3);
      const firstIssue = issues[0] as AuditIssue;
      expect(firstIssue.severity).toBe('error');
      expect(firstIssue.path).toBe('components[0]');
      expect(firstIssue.code).toBe('LINK_BUTTON_MISSING_URL');
      expect(firstIssue.fix).toContain('setURL');
    });
  });

  describe('ActionRow Compile-Time Type Safety', () => {
    it('should compile successfully for valid combinations', () => {
      const btn1 = new ButtonBuilder({ customId: '1', style: ButtonStyle.Primary, label: 'One' });
      const btn2 = new ButtonBuilder({ customId: '2', style: ButtonStyle.Primary, label: 'Two' });

      // Valid: Up to 5 buttons
      const row = new ActionRowBuilder().addComponents(btn1, btn2);
      expect(row.components.length).toBe(2);

      const select = new StringSelectMenuBuilder({
        customId: 'sel',
        options: [{ label: 'Opt 1', value: '1' }],
      });

      // Valid: Exactly 1 select menu
      const rowSelect = new ActionRowBuilder().addComponents(select);
      expect(rowSelect.components.length).toBe(1);
    });

    it('should assert compilation constraints under ts-expect-error', () => {
      const btn = new ButtonBuilder({ customId: '1', style: ButtonStyle.Primary, label: 'One' });
      const select = new StringSelectMenuBuilder({
        customId: 'sel',
        options: [{ label: 'Opt 1', value: '1' }],
      });

      const compileTimeOnly = () => {
        // @ts-expect-error - Mixing buttons and select menus is forbidden
        new ActionRowBuilder().addComponents(btn, select);

        // @ts-expect-error - Too many select menus (> 1)
        new ActionRowBuilder().addComponents(select, select);
      };

      compileTimeOnly();

      expect(() => {
        // @ts-expect-error - Too many buttons (> 5)
        new ActionRowBuilder().addComponents(btn, btn, btn, btn, btn, btn);
      }).toThrow('components size can\'t exceed 5');
    });
  });

  describe('Adversarial additions', () => {
    it('ButtonBuilder setStyle cleans up fields', () => {
      const btn = new ButtonBuilder({
        customId: 'click',
        label: 'Click',
        style: ButtonStyle.Primary,
      });
      expect(btn.customId).toBe('click');
      expect(btn.label).toBe('Click');

      btn.setStyle(ButtonStyle.Link);
      expect(btn.customId).toBeUndefined();
      expect(btn.style).toBe(ButtonStyle.Link);

      btn.setURL('https://google.com');
      btn.setStyle(ButtonStyle.Premium);
      expect(btn.url).toBeUndefined();
      expect(btn.style).toBe(ButtonStyle.Premium);
    });

    it('SectionBuilder accessory type validation', () => {
      const section = new SectionBuilder({
        components: [new TextDisplayBuilder({ content: 'Hello' })],
      });
      expect(() => section.setAccessory({ type: 99 } as unknown as SectionAccessory)).toThrow();
      const btn = new ButtonBuilder({ customId: 'btn', style: ButtonStyle.Primary, label: 'Btn' });
      section.setAccessory(btn);
      expect(section.toJSON().accessory).toBeDefined();
    });

    it('ModalBuilder component validation and V1 ActionRow legacy layout', () => {
      const btn = new ButtonBuilder({ customId: 'btn', style: ButtonStyle.Primary, label: 'Btn' });
      const row = new ActionRowBuilder().addComponents(btn);
      
      const modal = new ModalBuilder({
        customId: 'm1',
        title: 'Title',
      });
      modal.setComponents([row]);
      expect(modal.components.length).toBe(1);

      // toJSON size limits
      const emptyModal = new ModalBuilder({ customId: 'm2', title: 'T' });
      expect(() => emptyModal.toJSON()).toThrow('components must have between 1 and 5 entries');
    });

    it('SelectMenu default values type preservation with enum and custom strings', () => {
      const menu = new UserSelectMenuBuilder({
        customId: 'users',
      });
      menu.setDefaultUsers([
        { id: '123', type: 'custom_type' },
        { id: '456', type: SelectMenuDefaultValueType.User },
      ]);
      expect(menu.defaultValues[0]?.type).toBe('custom_type');
      expect(menu.defaultValues[1]?.type).toBe(SelectMenuDefaultValueType.User);
    });

    it('Omit empty arrays in select menus and check whitelisting', () => {
      const menu = new UserSelectMenuBuilder({
        customId: 'users',
      });
      const json = menu.toJSON();
      expect(json.default_values).toBeUndefined();
      expect(json.custom_id).toBe('users');
    });
  });
});
