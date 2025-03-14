import { CODES, KEYS } from "../keys";
import { register } from "./register";
import type { AppState, UIAppState } from "../types";
import { StoreAction } from "../store";
import { TopViewIcon, ElevationViewIcon } from "../components/icons";
import type { ExcalidrawElement } from "../element/types";

export const actionToggleView = register({
  name: "toggleView",
  icon: (appState: UIAppState, elements: readonly ExcalidrawElement[]) => 
    appState.currentView === "top" ? TopViewIcon : ElevationViewIcon,
  keywords: ["view", "top", "elevation"],
  label: "labels.toggleView",
  viewMode: true,
  trackEvent: {
    category: "canvas",
  },
  predicate: (elements, appState) => true,
  checked: (appState) => appState.currentView === "elevation",
  perform: (elements, appState) => {
    return {
      appState: {
        ...appState,
        currentView: appState.currentView === "top" ? "elevation" : "top",
      },
      storeAction: StoreAction.NONE,
    };
  },
  keyTest: (event) =>
    event.altKey &&
    event.code === CODES.V &&
    !event[KEYS.CTRL_OR_CMD] &&
    !event.shiftKey,
});