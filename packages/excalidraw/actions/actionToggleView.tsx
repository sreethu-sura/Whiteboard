import { CODES, KEYS } from "../keys";
import { register } from "./register";
import type { AppState, UIAppState } from "../types";
import { StoreAction } from "../store";
import { TopViewIcon, ElevationViewIcon } from "../components/icons";
import type {
  ExcalidrawElement,
  ExcalidrawCuboidElement,
} from "../element/types";
import {
  updateCuboidViewProperties,
  createElevationViewCuboid,
} from "../scene/Shape";
import { newElement } from "../element/newElement";

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
    try {
      // Get the new view with proper type annotation
      const newView: "top" | "elevation" =
        appState.currentView === "top" ? "elevation" : "top";

      // Keep track of any new elements we need to add
      const elementsToAdd: ExcalidrawElement[] = [];

      // Update all cuboid elements with the new view
      const updatedElements = elements.map((element) => {
        if (element.type === "cuboid") {
          try {
            // Skip elevation-only cuboids - they're handled separately
            if ((element as ExcalidrawCuboidElement).isElevationOnly) {
              // Just update the current view
              return {
                ...element,
                currentView: newView,
              };
            }

            // First update the currentView property
            const updatedElement = {
              ...element,
              currentView: newView,
            } as ExcalidrawCuboidElement;

            // Then apply the view-specific properties (height, etc.)
            // Use try/catch to prevent errors
            let processedElement;
            try {
              processedElement = updateCuboidViewProperties(updatedElement);
            } catch (error) {
              console.error("Error updating cuboid properties:", error);
              processedElement = updatedElement;
            }

            // If switching to elevation view, check if we need to create an elevation-only cuboid
            if (
              newView === "elevation" &&
              !processedElement.isElevationOnly &&
              !processedElement.hasElevationCuboid
            ) {
              // Create a new cuboid that will only appear in elevation view
              const newElements = createElevationViewCuboid(processedElement, {
                currentView: newView,
              });

              // Mark the original element as having an elevation cuboid
              const markedElement = {
                ...processedElement,
                hasElevationCuboid: true,
              };

              // Add all the new elements to our list of elements to add
              elementsToAdd.push(...newElements);

              return markedElement;
            }

            return processedElement;
          } catch (error) {
            console.error("Error processing cuboid element:", error);
            // Return the element as is if there's an error
            return element;
          }
        }
        return element;
      });

      // Combine the updated elements with any new ones
      const finalElements = [...updatedElements, ...elementsToAdd];

      return {
        elements: finalElements,
        appState: {
          ...appState,
          currentView: newView,
        },
        storeAction: StoreAction.NONE,
      };
    } catch (error) {
      console.error("Error toggling view:", error);
      // Return elements unchanged if there's an error
      return {
        elements,
        appState,
        storeAction: StoreAction.NONE,
      };
    }
  },
  keyTest: (event) =>
    event.altKey &&
    event.code === CODES.V &&
    !event[KEYS.CTRL_OR_CMD] &&
    !event.shiftKey,
});
