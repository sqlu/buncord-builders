export const enum ComponentType {
  // Standard horizontal container
  ActionRow = 1,
  // Clickable button component
  Button = 2,
  // Text dropdown select menu
  StringSelect = 3,
  // Text input component
  TextInput = 4,
  // User selection dropdown
  UserSelect = 5,
  // Role selection dropdown 
  RoleSelect = 6,
  // Mentionable user/role selection dropdown
  MentionableSelect = 7,
  // Channel selection dropdown 
  ChannelSelect = 8,
  // Section layout wrapper
  Section = 9,
  // Markdown text block component
  TextDisplay = 10,
  // Small image thumbnail accessory
  Thumbnail = 11,
  // Image/video gallery grid
  MediaGallery = 12,
  // Joint file attachment component
  File = 13,
  // Separator divider line
  Separator = 14,
  // Activity feed entry component; not usable by bots.
  ContentInventoryEntry = 16,
  // Top-level layout container wrapper
  Container = 17,
  // Form input label and description wrapper
  Label = 18,
  // File upload input element
  FileUpload = 19,
  // Checkpoint summary component; not usable by bots.
  CheckpointCard = 20,
  // Radio button choice list
  RadioGroup = 21,
  // Checkbox multi-select list
  CheckboxGroup = 22,
  // True/false checkbox option
  Checkbox = 23,
}

export const enum ButtonStyle {
  // Blurple color
  Primary = 1,
  // Grey color
  Secondary = 2,
  // Green color
  Success = 3,
  // Red color
  Danger = 4,
  // Grey color with external link indicator
  Link = 5,
  // Premium payment purchase button
  Premium = 6,
}

export const enum TextInputStyle {
  // Single-line text input
  Short = 1,
  // Multi-line paragraph text input
  Paragraph = 2,
}

export const enum SeparatorSpacingSize {
  Small = 1,
  Large = 2,
}

export const enum MessageFlags {
  IsComponentsV2 = 1 << 15,
}

export const enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildDirectory = 14,
  GuildForum = 15,
  GuildMedia = 16,
}

export const enum SelectMenuDefaultValueType {
  User = 'user',
  Role = 'role',
  Channel = 'channel',
}
