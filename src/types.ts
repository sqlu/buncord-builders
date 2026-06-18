import type {
  ComponentType,
  ButtonStyle,
  TextInputStyle,
  SeparatorSpacingSize,
  ChannelType,
  SelectMenuDefaultValueType,
} from './enums.ts';

export type RGBTuple = [r: number, g: number, b: number];
export type Snowflake = string;
export interface APIMessageComponentEmoji {
  id?: Snowflake;
  name?: string;
  animated?: boolean;
}

export interface APISelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: APIMessageComponentEmoji;
  default?: boolean;
}

export interface APISelectMenuDefaultValue {
  id: Snowflake;
  type: SelectMenuDefaultValueType | (string & {});
}

export interface JSONifiable {
  toJSON(): unknown;
}

export type APIMessageComponent =
  | APIButtonComponent
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

export interface APIActionRowComponent<
  T extends APIMessageComponent | APITextInputComponent = APIMessageComponent,
> {
  type: ComponentType.ActionRow;
  components: T[];
  id?: number;
}

export interface APIButtonComponent {
  type: ComponentType.Button;
  style: ButtonStyle;
  label?: string;
  emoji?: APIMessageComponentEmoji;
  custom_id?: string;
  sku_id?: string;
  url?: string;
  disabled?: boolean;
  id?: number;
}

export interface APIStringSelectComponent {
  type: ComponentType.StringSelect;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  options: APISelectMenuOption[];
  id?: number;
}

export interface APITextInputComponent {
  type: ComponentType.TextInput;
  custom_id: string;
  style: TextInputStyle;
  label?: string;
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  value?: string;
  required?: boolean;
  id?: number;
}

export interface APIUserSelectComponent {
  type: ComponentType.UserSelect;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  default_values?: APISelectMenuDefaultValue[];
  id?: number;
}

export interface APIRoleSelectComponent {
  type: ComponentType.RoleSelect;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  default_values?: APISelectMenuDefaultValue[];
  id?: number;
}

export interface APIMentionableSelectComponent {
  type: ComponentType.MentionableSelect;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  default_values?: APISelectMenuDefaultValue[];
  id?: number;
}

export interface APIChannelSelectComponent {
  type: ComponentType.ChannelSelect;
  custom_id: string;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  disabled?: boolean;
  default_values?: APISelectMenuDefaultValue[];
  channel_types?: ChannelType[];
  id?: number;
}

export interface APISectionComponent {
  type: ComponentType.Section;
  components: APITextDisplayComponent[];
  accessory?: APIButtonComponent | APIThumbnailComponent;
  id?: number;
}

export interface APITextDisplayComponent {
  type: ComponentType.TextDisplay;
  content: string;
  id?: number;
}

export interface APIThumbnailComponent {
  type: ComponentType.Thumbnail;
  media: { url: string };
  description?: string;
  spoiler?: boolean;
  id?: number;
}

export interface APIMediaGalleryItem {
  media: { url: string };
  description?: string;
  spoiler?: boolean;
}

export interface APIMediaGalleryComponent {
  type: ComponentType.MediaGallery;
  items: APIMediaGalleryItem[];
  id?: number;
}

export interface APIFileComponent {
  type: ComponentType.File;
  file: { url: string };
  spoiler?: boolean;
  id?: number;
}

export interface APISeparatorComponent {
  type: ComponentType.Separator;
  divider?: boolean;
  spacing?: SeparatorSpacingSize;
  id?: number;
}

export type APIContainerComponentChild =
  | APIActionRowComponent<APIMessageComponent>
  | APIFileComponent
  | APIMediaGalleryComponent
  | APISectionComponent
  | APISeparatorComponent
  | APITextDisplayComponent;

export interface APIContainerComponent {
  type: ComponentType.Container;
  accent_color?: number;
  spoiler?: boolean;
  components: APIContainerComponentChild[];
  id?: number;
}

export type APILabelComponentChild =
  | APITextInputComponent
  | APICheckboxComponent
  | APICheckboxGroupComponent
  | APIRadioGroupComponent
  | APIFileUploadComponent
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

export interface APILabelComponent {
  type: ComponentType.Label;
  label: string;
  description?: string;
  component: APILabelComponentChild;
  id?: number;
}

export type APIModalComponent =
  | APIActionRowComponent<APITextInputComponent>
  | APISectionComponent
  | APITextDisplayComponent
  | APILabelComponent;

export interface APIModalStructure {
  title: string;
  custom_id: string;
  components: APIModalComponent[];
}

export type APIComponent =
  | APIActionRowComponent<APIMessageComponent | APITextInputComponent>
  | APIButtonComponent
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent
  | APITextInputComponent
  | APISectionComponent
  | APITextDisplayComponent
  | APIThumbnailComponent
  | APIMediaGalleryComponent
  | APIFileComponent
  | APISeparatorComponent
  | APIContainerComponent
  | APILabelComponent
  | APIFileUploadComponent
  | APIRadioGroupComponent
  | APICheckboxGroupComponent
  | APICheckboxComponent;

export interface APIFileUploadComponent {
  type: ComponentType.FileUpload;
  custom_id: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  id?: number;
}

export interface APIRadioGroupOption {
  value: string;
  label: string;
  description?: string;
  default?: boolean;
}

export interface APIRadioGroupComponent {
  type: ComponentType.RadioGroup;
  custom_id: string;
  required?: boolean;
  options: APIRadioGroupOption[];
  id?: number;
}

export interface APICheckboxGroupOption {
  value: string;
  label: string;
  description?: string;
  default?: boolean;
}

export interface APICheckboxGroupComponent {
  type: ComponentType.CheckboxGroup;
  custom_id: string;
  min_values?: number;
  max_values?: number;
  required?: boolean;
  options: APICheckboxGroupOption[];
  id?: number;
}

export interface APICheckboxComponent {
  type: ComponentType.Checkbox;
  custom_id: string;
  default?: boolean;
  id?: number;
}

export type { ChannelType };
