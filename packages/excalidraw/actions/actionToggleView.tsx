import { CODES, KEYS } from "../keys";
import { register } from "./register";
import type { AppState, UIAppState } from "../types";
import { StoreAction } from "../store";
import { TopViewIcon, ElevationViewIcon } from "../components/icons";
import type { ExcalidrawElement, ExcalidrawCuboidElement } from "../element/types";
import { updateCuboidViewProperties } from "../scene/Shape";

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
    // Get the new view with proper type annotation
    const newView: "top" | "elevation" = appState.currentView === "top" ? "elevation" : "top";
    
    // Update all cuboid elements with the new view
    const updatedElements = elements.map(element => {
      if (element.type === "cuboid") {
        // First update the currentView property
        const updatedElement = {
          ...element,
          currentView: newView,
        } as ExcalidrawCuboidElement;
        
        // Then apply the view-specific properties (height, etc.)
        return updateCuboidViewProperties(updatedElement);
      }
      return element;
    });
    
    return {
      elements: updatedElements,
      appState: {
        ...appState,
        currentView: newView,
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