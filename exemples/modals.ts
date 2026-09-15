/**
 * @file modals.ts
 * @description Full modal example with LabelBuilder, TextInputBuilder, and RadioGroupBuilder.
 * Modals are sent as interaction responses (not webhook messages).
 *
 * Run with:  bun run exemples/modals.ts
 *
 * @see {@link https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-callback-modal-data-structure}
 */

import {
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from '../src/index.ts';

const modal = new ModalBuilder({
  customId: 'feedback:modal',
  title: 'Send Feedback',
  components: [
    new LabelBuilder({
      label: 'What should improve?',
      description: 'Be as specific as possible.',
      component: new TextInputBuilder({
        customId: 'feedback:message',
        style: TextInputStyle.Paragraph,
        minLength: 10,
        maxLength: 1000,
        placeholder: 'e.g. The onboarding flow is confusing...',
        required: true,
      }),
    }),

    new LabelBuilder({
      label: 'Priority',
      component: new RadioGroupBuilder({
        customId: 'feedback:priority',
        required: true,
        options: [
          new RadioGroupOptionBuilder({ value: 'low', label: 'Low' }),
          new RadioGroupOptionBuilder({ value: 'normal', label: 'Normal', default: true }),
          new RadioGroupOptionBuilder({ value: 'high', label: 'High' }),
          new RadioGroupOptionBuilder({ value: 'critical', label: 'Critical' }),
        ],
      }),
    }),

    new LabelBuilder({
      label: 'Category',
      component: new CheckboxGroupBuilder({
        customId: 'feedback:category',
        options: [
          new CheckboxGroupOptionBuilder({ value: 'ui', label: 'UI / Design' }),
          new CheckboxGroupOptionBuilder({ value: 'performance', label: 'Performance' }),
          new CheckboxGroupOptionBuilder({ value: 'bugs', label: 'Bugs' }),
          new CheckboxGroupOptionBuilder({ value: 'docs', label: 'Documentation' }),
        ],
        minValues: 1,
        maxValues: 4,
      }),
    }),

    new LabelBuilder({
      label: 'Screenshot (optional)',
      description: 'Attach up to 1 image.',
      component: new FileUploadBuilder({
        customId: 'feedback:screenshot',
        minValues: 0,
        maxValues: 1,
        required: false,
      }),
    }),
  ],
});

console.log('Modal payload:');
console.log(JSON.stringify(modal.toJSON(), null, 2));
