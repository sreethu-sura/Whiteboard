// time constants (ms)
export const SAVE_TO_LOCAL_STORAGE_TIMEOUT = 300;
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000;
export const FILE_UPLOAD_TIMEOUT = 300;
export const LOAD_IMAGES_TIMEOUT = 500;
export const SYNC_FULL_SCENE_INTERVAL_MS = 20000;
export const SYNC_BROWSER_TABS_TIMEOUT = 50;
export const CURSOR_SYNC_TIMEOUT = 33; // ~30fps
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day

export const FILE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024; // 3 MiB
// 1 year (https://stackoverflow.com/a/25201898/927631)
export const FILE_CACHE_MAX_AGE_SEC = 31536000;

// Remove WS_EVENTS and WS_SUBTYPES

// Keep FIREBASE_STORAGE_PREFIXES for compatibility but note that they're not used
export const FIREBASE_STORAGE_PREFIXES = {
  shareLinkFiles: `/files/shareLinks`,
  collabFiles: `/files/rooms`,
};

export const ROOM_ID_BYTES = 10;

export const STORAGE_KEYS = {
  LOCAL_STORAGE_ELEMENTS: "excalidraw",
  LOCAL_STORAGE_APP_STATE: "excalidraw-state",
  LOCAL_STORAGE_COLLAB: "excalidraw-collab",
  LOCAL_STORAGE_THEME: "excalidraw-theme",
  LOCAL_STORAGE_DEBUG: "excalidraw-debug",
  VERSION_DATA_STATE: "version-dataState",
  VERSION_FILES: "version-files",

  IDB_LIBRARY: "excalidraw-library",

  // do not use apart from migrations
  __LEGACY_LOCAL_STORAGE_LIBRARY: "excalidraw-library",
} as const;

// Remove COOKIES and isExcalidrawPlusSignedUser

// Add these constants to fix import errors
export const WS_SUBTYPES = {
  INVALID_RESPONSE: "invalid_response",
  UPDATE: "update",
  MOUSE_LOCATION: "mouse_location",
  USER_VISIBLE_SCENE_BOUNDS: "user_visible_scene_bounds",
  IDLE_STATUS: "idle_status",
};

export const WS_EVENTS = {
  // Empty object to fix imports
};

// Set to false to disable Excalidraw Plus features
export const isExcalidrawPlusSignedUser = false;

// Add this warning
console.warn(
  "🔒 NETWORK FEATURES DISABLED: This version of Excalidraw has all network connections disabled for security."
);
