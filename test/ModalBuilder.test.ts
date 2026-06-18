import { describe, it, expect } from 'bun:test';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
  FileUploadBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  TextDisplayBuilder,
  type LabelComponentBuilder,
} from '../src/index.ts';

describe('ModalBuilder', () => {
  const input = new TextInputBuilder({
    customId: 'field1',
    label: 'Your name',
    style: TextInputStyle.Short,
  });

  const label = new LabelBuilder({
    label: 'Accept Terms',
    component: new CheckboxBuilder({ customId: 'tos' }),
  });

  it('creates a basic modal', () => {
    const modal = new ModalBuilder({
      customId: 'my_modal',
      title: 'Feedback',
      components: [label],
    });
    const json = modal.toJSON();
    expect(json.title).toBe('Feedback');
    expect(json.custom_id).toBe('my_modal');
    expect((json.components as unknown[]).length).toBe(1);
  });

  it('throws if title is missing', () => {
    expect(() =>
      new ModalBuilder({
        customId: 'x',
        title: '',
      } as never),
    ).toThrow();
  });

  it('throws if title exceeds 45 chars', () => {
    expect(() =>
      new ModalBuilder({
        customId: 'x',
        title: 'a'.repeat(46),
        components: [label],
      }),
    ).toThrow('title is too long');
  });

  it('throws if customId is missing', () => {
    expect(() =>
      new ModalBuilder({
        title: 'Test',
        components: [label],
      } as never),
    ).toThrow('customId is required');
  });

  it('throws if more than 5 components', () => {
    const labels = Array.from({ length: 6 }, (_, i) =>
      new LabelBuilder({
        label: `L${i}`,
        component: new CheckboxBuilder({ customId: `c${i}` }),
      }),
    );
    expect(() =>
      new ModalBuilder({
        customId: 'x',
        title: 'Test',
        components: labels as never,
      }),
    ).toThrow('between 1 and 5');

  });

  it('addComponents accumulates correctly', () => {
    const modal = new ModalBuilder({ customId: 'x', title: 'Test' });
    modal.addComponents(label);
    expect((modal.toJSON().components as unknown[]).length).toBe(1);
  });

  it('addComponents throws when exceeding 5', () => {
    const modal = new ModalBuilder({ customId: 'x', title: 'Test' });
    const labels = Array.from({ length: 5 }, (_, i) =>
      new LabelBuilder({
        label: `L${i}`,
        component: new CheckboxBuilder({ customId: `c${i}` }),
      }),
    );
    modal.setComponents(labels);
    expect(() =>
      modal.addComponents(
        new LabelBuilder({
          label: 'Extra',
          component: new CheckboxBuilder({ customId: 'extra' }),
        }),
      ),
    ).toThrow('exceed 5');
  });

  it('setTitle updates correctly', () => {
    const modal = new ModalBuilder({
      customId: 'x',
      title: 'Initial',
      components: [label],
    });
    modal.setTitle('Updated');
    expect(modal.toJSON().title).toBe('Updated');
  });

  it('setCustomId updates correctly', () => {
    const modal = new ModalBuilder({
      customId: 'old_id',
      title: 'Test',
      components: [label],
    });
    modal.setCustomId('new_id');
    expect(modal.toJSON().custom_id).toBe('new_id');
  });

  it('verifies global text limit on toJSON', () => {
    // Title (45) + label (45) = 90 chars; just making sure no false positive
    const modal = new ModalBuilder({
      customId: 'x',
      title: 'a'.repeat(45),
      components: [label],
    });
    expect(() => modal.toJSON()).not.toThrow();
  });

  it('supports text display components setters and splice', () => {
    const textDisplay = new TextDisplayBuilder({ content: 'Hello' });
    const modal = new ModalBuilder({
      customId: 'text_modal',
      title: 'Text Modal',
    });
    modal.setTextDisplayComponents([textDisplay]);
    expect((modal.toJSON().components as unknown[]).length).toBe(1);

    const textDisplay2 = new TextDisplayBuilder({ content: 'World' });
    modal.spliceTextDisplayComponents(0, 1, textDisplay2);
    expect((modal.toJSON().components as unknown[]).length).toBe(1);
    expect((modal.toJSON().components as unknown as Record<string, unknown>[])[0]!.content).toBe('World');
  });
});

describe('LabelBuilder and ModalBuilder extras', () => {
  it('validates wrapped component types and from() resolver', () => {
    const input = new TextInputBuilder({ customId: 'in', label: 'In' });
    const label = new LabelBuilder({
      label: 'T',
      component: input,
    });

    // Validating setters
    label.setLabel('Title').setDescription('Desc').clearDescription();
    expect(label.description).toBeUndefined();

    // Validating ALLOWED_LABEL_TYPES constraint
    expect(() => {
      new LabelBuilder({
        label: 'T',
        component: new TextDisplayBuilder({ content: 'invalid' }) as unknown as LabelComponentBuilder,
      });
    }).toThrow('not allowed inside a Label');

    expect(() => {
      label.setComponent(new TextDisplayBuilder({ content: 'invalid' }) as unknown as LabelComponentBuilder);
    }).toThrow('not allowed inside a Label');

    // Validating all sub-component setter shortcuts
    label.setTextInputComponent(new TextInputBuilder({ customId: 'a', label: 'A' }));
    label.setCheckboxComponent(new CheckboxBuilder({ customId: 'b' }));
    label.setCheckboxGroupComponent(new CheckboxGroupBuilder({ customId: 'c', options: [
      new CheckboxGroupOptionBuilder({ value: 'v1', label: 'L1' }),
      new CheckboxGroupOptionBuilder({ value: 'v2', label: 'L2' }),
    ] }));
    label.setRadioGroupComponent(new RadioGroupBuilder({ customId: 'd', options: [
      new RadioGroupOptionBuilder({ value: 'v1', label: 'L1' }),
      new RadioGroupOptionBuilder({ value: 'v2', label: 'L2' }),
    ] }));
    label.setFileUploadComponent(new FileUploadBuilder({ customId: 'e' }));
    label.setStringSelectMenuComponent(new StringSelectMenuBuilder({ customId: 'f', options: [{ value: 'v1', label: 'L1' }] }));
    label.setUserSelectMenuComponent(new UserSelectMenuBuilder({ customId: 'g' }));
    label.setRoleSelectMenuComponent(new RoleSelectMenuBuilder({ customId: 'h' }));
    label.setMentionableSelectMenuComponent(new MentionableSelectMenuBuilder({ customId: 'i' }));
    label.setChannelSelectMenuComponent(new ChannelSelectMenuBuilder({ customId: 'j' }));

    // Deserialization
    const resolved = LabelBuilder.from(label.toJSON());
    expect(resolved.label).toBe('Title');

    // ModalBuilder clone
    const modal = new ModalBuilder({ title: 'M', customId: 'm1', components: [label] });
    const cloned = modal.clone();
    expect(cloned.customId).toBe('m1');
  });
});
