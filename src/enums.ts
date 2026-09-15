/**
 * All the Discord component types you can use.
 */
export const enum ComponentType {
  /** A basic row to put buttons and other items. */
  ActionRow = 1,
  /** A button users can click. */
  Button = 2,
  /** Classic text select menu. */
  StringSelect = 3,
  /** A text box for modal popups. */
  TextInput = 4,
  /** Select menu for choosing users. */
  UserSelect = 5,
  /** Select menu for choosing roles. */
  RoleSelect = 6,
  /** Select menu for users or roles. */
  MentionableSelect = 7,
  /** Select menu for choosing channels. */
  ChannelSelect = 8,
  /** A layout section to organize stuff. */
  Section = 9,
  /** Shows text, supports markdown. */
  TextDisplay = 10,
  /** Tiny image thumbnail helper. */
  Thumbnail = 11,
  /** Gallery for displaying images or videos. */
  MediaGallery = 12,
  /** Inline file attachment reference. */
  File = 13,
  /** A simple line divider. */
  Separator = 14,
  /** Activity feed stuff. Don't touch, bots can't use it. */
  ContentInventoryEntry = 16,
  /** Main wrapper component. */
  Container = 17,
  /** Label and description box for inputs. */
  Label = 18,
  /** File upload input helper. */
  FileUpload = 19,
  /** Not for bots. */
  CheckpointCard = 20,
  /** Radio buttons for single choice. */
  RadioGroup = 21,
  /** Checkbox list for picking multiple options. */
  CheckboxGroup = 22,
  /** A single checkbox toggle. */
  Checkbox = 23,
}

/**
 * Styles for buttons on Discord.
 */
export const enum ButtonStyle {
  /** The blue/blurple button. */
  Primary = 1,
  /** Gray button. */
  Secondary = 2,
  /** Green button. */
  Success = 3,
  /** Red button. */
  Danger = 4,
  /** Link button (gray with link icon). */
  Link = 5,
  /** Purple store button. */
  Premium = 6,
}

/**
 * TextInput styles for modals.
 */
export const enum TextInputStyle {
  /** Single line of text. */
  Short = 1,
  /** Multi-line text area. */
  Paragraph = 2,
}

/**
 * Spacing sizes for separator line.
 */
export const enum SeparatorSpacingSize {
  /** Small space. */
  Small = 1,
  /** Big space. */
  Large = 2,
}

/**
 * Message flags that an application is allowed to set when creating
 * a message or responding to an interaction.
 *
 * @see {@link https://docs.discord.com/developers/resources/message#message-flags}
 */
export const enum MessageFlags {
  /** Do not render any embeds for this message. */
  SuppressEmbeds = 1 << 2,
  /** Only the user who triggered the interaction can see this message. */
  Ephemeral = 1 << 6,
  /** Do not trigger push or desktop notifications for this message. */
  SuppressNotifications = 1 << 12,
  /** This message is a voice message. */
  VoiceMessage = 1 << 13,

  IsComponentsV2 = 1 << 15,
}

/**
 * Channel types for filtering select menus.
 */
export const enum ChannelType {
  /** Server text channel. */
  GuildText = 0,
  /** Direct message. */
  DM = 1,
  /** Voice channel. */
  GuildVoice = 2,
  /** Group DM. */
  GroupDM = 3,
  /** Channel category. */
  GuildCategory = 4,
  /** Announcement channel. */
  GuildAnnouncement = 5,
  /** Thread in announcement channel. */
  AnnouncementThread = 10,
  /** Public thread. */
  PublicThread = 11,
  /** Private thread. */
  PrivateThread = 12,
  /** Stage channel. */
  GuildStageVoice = 13,
  /** Directory channel. */
  GuildDirectory = 14,
  /** Forum channel. */
  GuildForum = 15,
  /** Media channel. */
  GuildMedia = 16,
}

/**
 * Default values for select menus.
 */
export const enum SelectMenuDefaultValueType {
  /** Default user. */
  User = 'user',
  /** Default role. */
  Role = 'role',
  /** Default channel. */
  Channel = 'channel',
}
