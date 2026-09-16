import type {
  ComponentType,
  ButtonStyle,
  TextInputStyle,
  SeparatorSpacingSize,
  ChannelType,
  SelectMenuDefaultValueType,
} from './enums.ts';

/**
 * A color in RGB format.
 * A tuple of three numbers: red, green, and blue, each ranging from 0 to 255.
 */
export type RGBTuple = [r: number, g: number, b: number];

/**
 * Discord snowflake ID.
 */
export type Snowflake = string;

/**
 * A URL or attachment reference used by media-backed components.
 *
 * @see {@link https://docs.discord.com/developers/components/reference#unfurled-media-item-structure}
 */
export interface APIUnfurledMediaItem {
  /** The media source, either an arbitrary URL or an `attachment://<filename>` reference (max 2048 characters). */
  url: string;
}

/**
 * Emoji used in buttons and select menus.
 */
export interface APIMessageComponentEmoji {
  /** The unique ID of the custom emoji. Omitted for standard Unicode emojis. */
  id?: Snowflake;
  /** The name of the custom emoji, or the Unicode character for standard emojis. */
  name?: string;
  /** Whether this emoji is animated. */
  animated?: boolean;
}

/**
 * An option in a string select menu.
 */
export interface APISelectMenuOption {
  /** The user-facing label of the option (max 100 characters). */
  label: string;
  /** The developer-defined value of the option returned upon selection (max 100 characters). */
  value: string;
  /** An optional description of the option (max 100 characters). */
  description?: string;
  /** An optional emoji to display next to the option label. */
  emoji?: APIMessageComponentEmoji;
  /** Whether this option is pre-selected by default. */
  default?: boolean;
}

/**
 * Default pre-selected value for auto select menus.
 */
export interface APISelectMenuDefaultValue {
  /** The snowflake ID of the default user, role, or channel. */
  id: Snowflake;
  /** The type of default value being referenced. */
  type: SelectMenuDefaultValueType | (string & {});
}

/**
 * Object that serializes to a raw API payload.
 */
export interface JSONifiable {
  /** Serializes the builder instance to its raw Discord API representation. */
  toJSON(): unknown;
}

/**
 * Message component inside an ActionRow.
 */
export type APIMessageComponent =
  | APIButtonComponent
  | APIStringSelectComponent
  | APIUserSelectComponent
  | APIRoleSelectComponent
  | APIMentionableSelectComponent
  | APIChannelSelectComponent;

/**
 * Layout row containing interactive components.
 * An ActionRow can hold buttons, or exactly one select menu, or one text input.
 * 
 * @template T The type of component residing in this row.
 */
export interface APIActionRowComponent<
  T extends APIMessageComponent | APITextInputComponent = APIMessageComponent,
 > {
  /** The type of component (always ComponentType.ActionRow). */
  type: ComponentType.ActionRow;
  /** The list of components contained within this row. */
  components: T[];
  /** Optional database/Discord ID for tracking the component state. */
  id?: number;
}

/**
 * Button component payload.
 */
export interface APIButtonComponent {
  /** The component type (always ComponentType.Button). */
  type: ComponentType.Button;
  /** The visual style of the button (Primary, Secondary, Success, Danger, Link, or Premium). */
  style: ButtonStyle;
  /** The text label displayed on the button (max 80 characters). Omitted for Premium style. */
  label?: string;
  /** The emoji displayed on the button. Omitted for Premium style. */
  emoji?: APIMessageComponentEmoji;
  /** The developer-defined identifier for handling click interactions (max 100 characters). Omitted for Link/Premium styles. */
  custom_id?: string;
  /** The subscription SKU ID for purchasing a premium SKU. Required only for Premium buttons. */
  sku_id?: string;
  /** The URL linked to this button. Required only for Link buttons. */
  url?: string;
  /** Whether the button is disabled and cannot be clicked. */
  disabled?: boolean;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * String select menu payload.
 */
export interface APIStringSelectComponent {
  /** The component type (always ComponentType.StringSelect). */
  type: ComponentType.StringSelect;
  /** The developer-defined identifier for handling selections (max 100 characters). */
  custom_id: string;
  /** The placeholder text shown when no option is selected (max 150 characters). */
  placeholder?: string;
  /** The minimum number of options the user must pick (0 to 25). */
  min_values?: number;
  /** The maximum number of options the user can pick (1 to 25). */
  max_values?: number;
  /** Whether selecting an option is required (used in modal submissions). */
  required?: boolean;
  /** Whether the select menu is disabled. */
  disabled?: boolean;
  /** The array of select options available (1 to 25 options). */
  options: APISelectMenuOption[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Text input payload for modals.
 */
export interface APITextInputComponent {
  /** The component type (always ComponentType.TextInput). */
  type: ComponentType.TextInput;
  /** The developer-defined identifier for retrieving the input value (max 100 characters). */
  custom_id: string;
  /** The text input visual style (Short or Paragraph). */
  style: TextInputStyle;
  /** The label text prompting the user (max 45 characters). */
  label?: string;
  /** The minimum character length required (0 to 4000). */
  min_length?: number;
  /** The maximum character length allowed (1 to 4000). */
  max_length?: number;
  /** The placeholder text displayed when the input is empty (max 100 characters). */
  placeholder?: string;
  /** The prefilled default value of the text input (max 4000 characters). */
  value?: string;
  /** Whether this field is required to be filled. */
  required?: boolean;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Select menu for picking users.
 */
export interface APIUserSelectComponent {
  /** The component type (always ComponentType.UserSelect). */
  type: ComponentType.UserSelect;
  /** The developer-defined identifier for handling selections (max 100 characters). */
  custom_id: string;
  /** The placeholder text shown when no option is selected (max 150 characters). */
  placeholder?: string;
  /** The minimum number of users the developer requires (0 to 25). */
  min_values?: number;
  /** The maximum number of users the developer allows (1 to 25). */
  max_values?: number;
  /** Whether selecting a user is required. */
  required?: boolean;
  /** Whether the select menu is disabled. */
  disabled?: boolean;
  /** The list of default selected users. */
  default_values?: APISelectMenuDefaultValue[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Select menu for picking roles.
 */
export interface APIRoleSelectComponent {
  /** The component type (always ComponentType.RoleSelect). */
  type: ComponentType.RoleSelect;
  /** The developer-defined identifier for handling selections (max 100 characters). */
  custom_id: string;
  /** The placeholder text shown when no option is selected (max 150 characters). */
  placeholder?: string;
  /** The minimum number of roles required (0 to 25). */
  min_values?: number;
  /** The maximum number of roles allowed (1 to 25). */
  max_values?: number;
  /** Whether selecting a role is required. */
  required?: boolean;
  /** Whether the select menu is disabled. */
  disabled?: boolean;
  /** The list of default selected roles. */
  default_values?: APISelectMenuDefaultValue[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Select menu for picking users or roles.
 */
export interface APIMentionableSelectComponent {
  /** The component type (always ComponentType.MentionableSelect). */
  type: ComponentType.MentionableSelect;
  /** The developer-defined identifier for handling selections (max 100 characters). */
  custom_id: string;
  /** The placeholder text shown when no option is selected (max 150 characters). */
  placeholder?: string;
  /** The minimum number of entities required (0 to 25). */
  min_values?: number;
  /** The maximum number of entities allowed (1 to 25). */
  max_values?: number;
  /** Whether selecting a mentionable entity is required. */
  required?: boolean;
  /** Whether the select menu is disabled. */
  disabled?: boolean;
  /** The list of default selected mentionables. */
  default_values?: APISelectMenuDefaultValue[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Select menu for picking channels.
 */
export interface APIChannelSelectComponent {
  /** The component type (always ComponentType.ChannelSelect). */
  type: ComponentType.ChannelSelect;
  /** The developer-defined identifier for handling selections (max 100 characters). */
  custom_id: string;
  /** The placeholder text shown when no option is selected (max 150 characters). */
  placeholder?: string;
  /** The minimum number of channels required (0 to 25). */
  min_values?: number;
  /** The maximum number of channels allowed (1 to 25). */
  max_values?: number;
  /** Whether selecting a channel is required. */
  required?: boolean;
  /** Whether the select menu is disabled. */
  disabled?: boolean;
  /** The list of default selected channels. */
  default_values?: APISelectMenuDefaultValue[];
  /** The list of channel types allowed in this select menu (e.g. GuildText, GuildVoice). */
  channel_types?: ChannelType[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Discord V2 section layout.
 */
export interface APISectionComponent {
  /** The component type (always ComponentType.Section). */
  type: ComponentType.Section;
  /** The list of text display elements residing inside this layout section. */
  components: APITextDisplayComponent[];
  /** The optional accessory component (button or thumbnail image) aligned within the section. */
  accessory?: APIButtonComponent | APIThumbnailComponent;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * V2 text display component.
 */
export interface APITextDisplayComponent {
  /** The component type (always ComponentType.TextDisplay). */
  type: ComponentType.TextDisplay;
  /** The text string content (max 4000 characters). Supports Discord markdown formatting. */
  content: string;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * V2 thumbnail image component.
 */
export interface APIThumbnailComponent {
  /** The component type (always ComponentType.Thumbnail). */
  type: ComponentType.Thumbnail;
  /** The media object containing the source image URL. */
  media: APIUnfurledMediaItem;
  /** Optional descriptive alt text for accessibility. */
  description?: string;
  /** Whether to blur the image and mark it as a spoiler. */
  spoiler?: boolean;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Media item in a MediaGallery.
 */
export interface APIMediaGalleryItem {
  /** The media object containing the source asset URL. */
  media: APIUnfurledMediaItem;
  /** Optional descriptive alt text for accessibility. */
  description?: string;
  /** Whether to blur the item and mark it as a spoiler. */
  spoiler?: boolean;
}

/**
 * V2 media gallery component.
 */
export interface APIMediaGalleryComponent {
  /** The component type (always ComponentType.MediaGallery). */
  type: ComponentType.MediaGallery;
  /** The list of media items displayed within this gallery. */
  items: APIMediaGalleryItem[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * V2 file attachment.
 */
export interface APIFileComponent {
  /** The component type (always ComponentType.File). */
  type: ComponentType.File;
  /** The file object containing the source asset attachment URL. Does not support arbitrary URLs. */
  file: APIUnfurledMediaItem;
  /** Whether to blur the attachment preview. */
  spoiler?: boolean;
  /** The name of the attached file. Received only, it cannot be set. */
  name?: string;
  /** The size of the attached file in bytes. Received only, it cannot be set. */
  size?: number;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * V2 line divider.
 */
export interface APISeparatorComponent {
  /** The component type (always ComponentType.Separator). */
  type: ComponentType.Separator;
  /** Whether to draw a visible boundary line. Defaults to true. */
  divider?: boolean;
  /** The spacing padding size around the separator (Small or Large). */
  spacing?: SeparatorSpacingSize;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Child layout component inside a Container.
 */
export type APIContainerComponentChild =
  | APIActionRowComponent<APIMessageComponent>
  | APIFileComponent
  | APIMediaGalleryComponent
  | APISectionComponent
  | APISeparatorComponent
  | APITextDisplayComponent;

/**
 * V2 Container layout component.
 */
export interface APIContainerComponent {
  /** The component type (always ComponentType.Container). */
  type: ComponentType.Container;
  /** Optional accent color represented as an integer (e.g. RGB packed color). */
  accent_color?: number;
  /** Whether the container items are hidden behind a spoiler click toggle. */
  spoiler?: boolean;
  /** The nested subcomponents contained within the container wrapper. */
  components: APIContainerComponentChild[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Input element inside a Label wrapper.
 */
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

/**
 * V2 label component framing input builders.
 */
export interface APILabelComponent {
  /** The component type (always ComponentType.Label). */
  type: ComponentType.Label;
  /** The header label text prompt. */
  label: string;
  /** The optional description/helper text explaining the input. */
  description?: string;
  /** The interactive input component framed by this label. */
  component: APILabelComponentChild;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Component inside a modal.
 */
export type APIModalComponent =
  | APIActionRowComponent<APITextInputComponent>
  | APITextDisplayComponent
  | APILabelComponent;

/**
 * Structure of a Modal popup.
 */
export interface APIModalStructure {
  /** The title heading shown at the top of the modal popup (max 45 characters). */
  title: string;
  /** The developer-defined identifier triggered on form submission (max 100 characters). */
  custom_id: string;
  /** The list of input component rows or label wrappers contained in the modal dialog (max 5 items). */
  components: APIModalComponent[];
}

/**
 * Discord component payload.
 */
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

/**
 * V2 file upload payload.
 */
export interface APIFileUploadComponent {
  /** The component type (always ComponentType.FileUpload). */
  type: ComponentType.FileUpload;
  /** The developer-defined identifier triggered on file uploads. */
  custom_id: string;
  /** The minimum number of files the user must upload (0 to 10). Defaults to 1. */
  min_values?: number;
  /** The maximum number of files the user can upload (1 to 10). Defaults to 1. */
  max_values?: number;
  /** Whether upload submission is required. Defaults to true. */
  required?: boolean;
  /** The file extensions the user is allowed to upload (max 10). Send only, it is never received. */
  file_types?: string[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Option choice in a RadioGroup.
 */
export interface APIRadioGroupOption {
  /** The developer-defined value of the chosen option returned upon submission (max 100 characters). */
  value: string;
  /** The user-facing label text of the option (max 100 characters). */
  label: string;
  /** An optional helper description (max 100 characters). */
  description?: string;
  /** Whether this radio option is selected by default. */
  default?: boolean;
}

/**
 * V2 radio selection group.
 */
export interface APIRadioGroupComponent {
  /** The component type (always ComponentType.RadioGroup). */
  type: ComponentType.RadioGroup;
  /** The developer-defined identifier for handling submissions. */
  custom_id: string;
  /** Whether selecting a radio option is required. */
  required?: boolean;
  /** The list of selectable options (2 to 10 options). */
  options: APIRadioGroupOption[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * Option in a CheckboxGroup.
 */
export interface APICheckboxGroupOption {
  /** The developer-defined value of the chosen option returned upon selection (max 100 characters). */
  value: string;
  /** The user-facing label text of the option (max 100 characters). */
  label: string;
  /** An optional helper description (max 100 characters). */
  description?: string;
  /** Whether this option is checked by default. */
  default?: boolean;
}

/**
 * V2 checkbox group component.
 */
export interface APICheckboxGroupComponent {
  /** The component type (always ComponentType.CheckboxGroup). */
  type: ComponentType.CheckboxGroup;
  /** The developer-defined identifier for handling check selection submissions. */
  custom_id: string;
  /** The minimum number of checkboxes the user must check (0 to 10). */
  min_values?: number;
  /** The maximum number of checkboxes the user can check (1 to 10). */
  max_values?: number;
  /** Whether checking checkboxes is required. */
  required?: boolean;
  /** The list of selectable checkbox options (1 to 10 options). */
  options: APICheckboxGroupOption[];
  /** Optional database/Discord ID for tracking. */
  id?: number;
}

/**
 * V2 checkbox toggle.
 */
export interface APICheckboxComponent {
  /** The component type (always ComponentType.Checkbox). */
  type: ComponentType.Checkbox;
  /** The developer-defined identifier for handling checking toggles. */
  custom_id: string;
  /** Whether the checkbox is toggled to true by default. */
  default?: boolean;
  /** Optional database/Discord ID for tracking. */
  id?: number;
}
