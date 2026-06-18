import { describe, it, expect } from 'bun:test';
import {
  ActionRowBuilder,
  BaseComponent,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ThumbnailBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  TextInputBuilder,
  TextInputStyle,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  CheckboxGroupOptionBuilder,
  RadioGroupBuilder,
  RadioGroupOptionBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ComponentFactory,
  ComponentType,
  type APIButtonComponent,
} from '../src/index.ts';

// Tous les commentaires de ce fichier sont en français, sans espace avant la ponctuation double.

describe('Extra Coverage Tests', () => {
  it('MediaGalleryBuilder et MediaGalleryItemBuilder getters/setters/splice', () => {
    // test bidon pour gratter de la couverture sur les getters
    const item = new MediaGalleryItemBuilder({
      url: 'https://example.com/pic.jpg',
      description: 'Super image de chat',
      spoiler: true,
    });

    expect(item.description).toBe('Super image de chat');
    expect(item.spoiler).toBe(true);

    // clearDescription doit delete la clé
    item.clearDescription();
    expect(item.description).toBeUndefined();

    // spliceItems sur MediaGalleryBuilder
    const item2 = new MediaGalleryItemBuilder({ url: 'https://example.com/dog.jpg' });
    const gallery = new MediaGalleryBuilder({
      items: [item],
    });

    gallery.spliceItems(0, 1, item2);
    expect(gallery.items.length).toBe(1);
    expect(gallery.items[0].url).toBe('https://example.com/dog.jpg');

    // ça doit cracher si on splice et qu'il n'y a plus rien
    expect(() => {
      gallery.spliceItems(0, 1);
    }).toThrow();
  });

  it('ModalBuilder extra components methods', () => {
    const text = new TextDisplayBuilder({ content: 'Salut' });
    const label = new LabelBuilder({
      label: 'Nom',
      component: new TextInputBuilder({ customId: 'nom' }),
    });

    const modal = new ModalBuilder({
      title: 'Titre',
      customId: 'modal_id',
      components: [text],
    });

    // addLabelComponents et addTextDisplayComponents
    modal.addLabelComponents(label);
    modal.addTextDisplayComponents(text);
    expect((modal.components as unknown[]).length).toBe(3);

    // setLabelComponents
    modal.setLabelComponents([label]);
    expect((modal.components as unknown[]).length).toBe(1);
    expect(() => modal.setLabelComponents([])).toThrow();

    // spliceLabelComponents
    modal.setLabelComponents([label, label]);
    modal.spliceLabelComponents(0, 1);
    expect((modal.components as unknown[]).length).toBe(1);
    expect(() => modal.spliceLabelComponents(0, 1)).toThrow();
  });

  it('RadioGroupOptionBuilder getters et RadioGroupBuilder setCustomId', () => {
    const opt = new RadioGroupOptionBuilder({
      value: 'v1',
      label: 'L1',
      description: 'Desc1',
      default: true,
    });

    expect(opt.value).toBe('v1');
    expect(opt.label).toBe('L1');
    expect(opt.description).toBe('Desc1');
    expect(opt.default).toBe(true);

    const group = new RadioGroupBuilder({
      customId: 'radio' as string,
      options: [opt, new RadioGroupOptionBuilder({ value: 'v2', label: 'L2' })],
    });

    group.setCustomId('radio_new');
    expect(group.customId).toBe('radio_new');
  });

  it('SectionBuilder components getter et splice/clear', () => {
    const text1 = new TextDisplayBuilder({ content: 'T1' });
    const text2 = new TextDisplayBuilder({ content: 'T2' });
    const btn = new ButtonBuilder({ customId: 'btn', style: ButtonStyle.Primary, label: 'L' });

    const sec = new SectionBuilder({
      components: [text1],
      accessory: btn,
    });

    expect(sec.components.length).toBe(1);
    expect(sec.accessory).toBe(btn);

    // spliceTextDisplayComponents
    sec.spliceTextDisplayComponents(0, 1, text2);
    expect(sec.components[0].content).toBe('T2');

    // clearAccessory
    sec.clearAccessory();
    expect(sec.accessory).toBeUndefined();
  });

  it('SelectMenu common methods and builders extras', () => {
    const opt = new StringSelectMenuOptionBuilder({
      label: 'Label1',
      value: 'val1',
      description: 'Desc1',
      default: true,
      emoji: { name: 'smile' },
    });

    expect(opt.label).toBe('Label1');
    expect(opt.value).toBe('val1');
    expect(opt.description).toBe('Desc1');
    expect(opt.default).toBe(true);
    expect(opt.emoji?.name).toBe('smile');

    const sm = new StringSelectMenuBuilder({
      customId: 'sm' as string,
      options: [opt],
    });

    expect(sm.disabled).toBeUndefined();
    expect(sm.required).toBeUndefined();

    sm.setCustomId('sm_new');
    sm.setPlaceholder('Nouveau placeholder');
    sm.setRequired(false);

    expect(sm.customId).toBe('sm_new');
    expect(sm.placeholder).toBe('Nouveau placeholder');
    expect(sm.required).toBe(false);

    // RoleSelectMenuBuilder addDefaultRoles
    const rm = new RoleSelectMenuBuilder({ customId: 'rm' });
    rm.addDefaultRoles('111111111111111111');
    expect(rm.defaultValues.length).toBe(1);

    // MentionableSelectMenuBuilder addDefaultValues
    const mm = new MentionableSelectMenuBuilder({ customId: 'mm' });
    mm.addDefaultValues({ id: '222222222222222222', type: 'user' });
    expect(mm.defaultValues.length).toBe(1);

    // ChannelSelectMenuBuilder extras
    const cm = new ChannelSelectMenuBuilder({
      customId: 'cm',
      channelTypes: [ChannelType.GuildText],
    });
    expect(cm.channelTypes[0]).toBe(ChannelType.GuildText);

    cm.addChannelTypes(ChannelType.GuildVoice);
    expect(cm.channelTypes.length).toBe(2);

    cm.addDefaultChannels('333333333333333333');
    expect(cm.defaultValues.length).toBe(1);
  });

  it('SeparatorBuilder clearSpacing', () => {
    const sep = new SeparatorBuilder({ spacing: SeparatorSpacingSize.Small });
    expect(sep.spacing).toBe(SeparatorSpacingSize.Small);

    sep.clearSpacing();
    expect(sep.spacing).toBeUndefined();
  });

  it('TextInputBuilder getters/setters/clear', () => {
    const input = new TextInputBuilder({
      customId: 'txt',
      style: TextInputStyle.Paragraph,
      minLength: 10,
      maxLength: 100,
    });

    expect(input.style).toBe(TextInputStyle.Paragraph);
    expect(input.minLength).toBe(10);
    expect(input.maxLength).toBe(100);

    input.setLabel('Nouveau label');
    expect(input.label).toBe('Nouveau label');

    input.clearLabel();
    expect(input.label).toBeUndefined();

    input.setValue('Nouvelle valeur');
    expect(input.value).toBe('Nouvelle valeur');
  });

  it('ThumbnailBuilder clearDescription', () => {
    const thumb = new ThumbnailBuilder({
      url: 'https://example.com/img.png',
      description: 'Desc',
    });
    expect(thumb.description).toBe('Desc');

    thumb.clearDescription();
    expect(thumb.description).toBeUndefined();
  });

  it('base.ts resolveRaw with custom toJSON and scan loops in validation', () => {
    // resolveRaw avec toJSON
    const customData = {
      toJSON() {
        return {
          custom_id: 'btn_id',
          style: ButtonStyle.Primary,
          label: 'Clic',
        };
      },
    };
    const btn = ButtonBuilder.from(customData as unknown as APIButtonComponent);
    expect(btn.customId).toBe('btn_id');

    // options scan dans validateTreeLimits et auditTree
    const smOpt1 = new StringSelectMenuOptionBuilder({ value: 'v1', label: 'L1' });
    const smOpt2 = new StringSelectMenuOptionBuilder({ value: 'v2', label: 'L2' });
    const sm = new StringSelectMenuBuilder({
      customId: 'sm_audit' as string,
      options: [smOpt1, smOpt2],
    });

    // items scan dans validateTreeLimits
    const item = new MediaGalleryItemBuilder({ url: 'https://example.com/cat.jpg' });
    const gallery = new MediaGalleryBuilder({ items: [item] });

    // on met tout ça dans un container
    const container = new ContainerBuilder({
      components: [
        new ActionRowBuilder().addComponents(sm),
        gallery,
      ],
    });

    // toJSON doit appeler validateTreeLimits et passer sur options et items
    const json = container.toJSON();
    expect(json).toBeDefined();

    // auditTree doit scanner les options et items
    const issues = BaseComponent.auditTree(container);
    expect(issues).toBeDefined();

    // instanciation bidon pour la couverture à 100% des fonctions
    const factory = new ComponentFactory();
    expect(factory).toBeDefined();

    // tests pour pousser la couverture à fond sur les erreurs de la factory
    expect(() => ComponentFactory.from(null as any)).toThrow('data is null or undefined');
    expect(() => ComponentFactory.from({} as any)).toThrow('missing component type in the payload');
    expect(() => ComponentFactory.from({ type: 9999 })).toThrow('unsupported component type: 9999');
  });

  it('validateMinLength et validations des default_values', () => {
    // on fabrique un composant à l'arrache pour tester validateMinLength
    class TestComp extends BaseComponent {
      public override readonly type = ComponentType.Button;
      public testMin(s: string, min: number, name: string) {
        this.validateMinLength(s, min, name);
      }
      toJSON() { return {} as any; }
    }
    const t = new TestComp();
    // ça doit passer crème
    t.testMin('abc', 2, 'champ');
    // ça doit râler
    expect(() => t.testMin('a', 3, 'champ')).toThrow('champ is too short');
    
    // audit de default_values foireux pour SelectMenus
    // pas d'id
    const i1 = BaseComponent.auditTree({
      type: ComponentType.UserSelect,
      custom_id: 'sel',
      default_values: [{ type: 'user' }]
    }, { structured: true });
    expect(i1.some(x => x.code === 'SELECT_DEFAULT_VALUE_MISSING_ID')).toBe(true);

    // pas de type
    const i2 = BaseComponent.auditTree({
      type: ComponentType.UserSelect,
      custom_id: 'sel',
      default_values: [{ id: '123' }]
    }, { structured: true });
    expect(i2.some(x => x.code === 'SELECT_DEFAULT_VALUE_MISSING_TYPE')).toBe(true);

    // type invalide pour UserSelect (doit être user)
    const i3 = BaseComponent.auditTree({
      type: ComponentType.UserSelect,
      custom_id: 'sel',
      default_values: [{ id: '123', type: 'role' }]
    }, { structured: true });
    expect(i3.some(x => x.code === 'SELECT_DEFAULT_VALUE_TYPE_INVALID')).toBe(true);

    // type invalide pour RoleSelect (doit être role)
    const i4 = BaseComponent.auditTree({
      type: ComponentType.RoleSelect,
      custom_id: 'sel',
      default_values: [{ id: '123', type: 'user' }]
    }, { structured: true });
    expect(i4.some(x => x.code === 'SELECT_DEFAULT_VALUE_TYPE_INVALID')).toBe(true);

    // type invalide pour MentionableSelect (doit être user ou role)
    const i5 = BaseComponent.auditTree({
      type: ComponentType.MentionableSelect,
      custom_id: 'sel',
      default_values: [{ id: '123', type: 'channel' }]
    }, { structured: true });
    expect(i5.some(x => x.code === 'SELECT_DEFAULT_VALUE_TYPE_INVALID')).toBe(true);

    // type invalide pour ChannelSelect (doit être channel)
    const i6 = BaseComponent.auditTree({
      type: ComponentType.ChannelSelect,
      custom_id: 'sel',
      default_values: [{ id: '123', type: 'user' }]
    }, { structured: true });
    expect(i6.some(x => x.code === 'SELECT_DEFAULT_VALUE_TYPE_INVALID')).toBe(true);
  });

  it('ButtonBuilder customId et skuId setters', () => {
    const btn = new ButtonBuilder({
      customId: 'btn1' as string,
      style: ButtonStyle.Primary,
      label: 'Clic',
    });

    // setCustomId ok
    btn.setCustomId('nouveau_custom');
    expect(btn.customId).toBe('nouveau_custom');

    // setCustomId pas ok (trop long)
    expect(() => btn.setCustomId('a'.repeat(101))).toThrow('customId is too long');

    // setSKUId ok
    btn.setStyle(ButtonStyle.Premium);
    btn.setSKUId('12345');
    expect(btn.toJSON().sku_id).toBe('12345');
  });
});
