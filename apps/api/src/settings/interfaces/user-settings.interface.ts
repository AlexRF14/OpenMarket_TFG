export interface NotificationSettings {
  email: boolean;
  push: boolean;
  chat_messages: boolean;
  operations: boolean;
  marketing: boolean;
}

export interface PrivacySettings {
  public_profile: boolean;
  allow_messages: boolean;
  show_valoraciones: boolean;
}

export interface AccessibilitySettings {
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
}

export interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  notifications: {
    email: true,
    push: true,
    chat_messages: true,
    operations: true,
    marketing: false,
  },
  privacy: {
    public_profile: false,
    allow_messages: true,
    show_valoraciones: true,
  },
  accessibility: {
    reduce_motion: false,
    high_contrast: false,
    large_text: false,
  },
};
