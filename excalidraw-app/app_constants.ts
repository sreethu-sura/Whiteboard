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

// Update the warning message
console.warn(
  "🔒 FEATURES DISABLED: This version of Excalidraw has network connections and the Browse Libraries feature disabled for security. Personal library functionality is still available."
);

// Globally disable library browsing functionality
(function disableLibraryBrowsing() {
  if (typeof window !== 'undefined') {
    // Override any potential library browsing methods
    const originalOpen = window.open;
    window.open = function(...args) {
      // Block any library browsing URLs
      const url = args[0];
      if (url && typeof url === 'string' && (
        url.includes('libraries.excalidraw.com') || 
        url.includes('library-backend')
      )) {
        console.warn('Library browsing is disabled');
        return null;
      }
      return originalOpen.apply(this, args);
    };

    // Add a MutationObserver to hide the Browse Libraries button if it appears
    const observer = new MutationObserver((mutations) => {
      const browseButtons = document.querySelectorAll('.library-menu-browse-button');
      browseButtons.forEach(button => {
        if (button instanceof HTMLElement) {
          button.style.display = 'none';
        }
      });
    });

    // Start observing once the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    });
  }
})();
