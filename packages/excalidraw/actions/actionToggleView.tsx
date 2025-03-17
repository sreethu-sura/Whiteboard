import { CODES, KEYS } from "../keys";
import { register } from "./register";
import type { AppState, UIAppState } from "../types";
import { StoreAction } from "../store";
import { TopViewIcon, ElevationViewIcon } from "../components/icons";
import type { ExcalidrawElement, ExcalidrawCuboidElement } from "../element/types";
import { updateCuboidViewProperties, createElevationViewCuboid } from "../scene/Shape";
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
    // Get the new view with proper type annotation
    const newView: "top" | "elevation" = appState.currentView === "top" ? "elevation" : "top";
    
    // Keep track of any new elements we need to add
    const elementsToAdd: ExcalidrawElement[] = [];
    
    // Update all cuboid elements with the new view
    const updatedElements = elements.map(element => {
      if (element.type === "cuboid") {
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
        const processedElement = updateCuboidViewProperties(updatedElement) as ExcalidrawCuboidElement;
        
        // If switching to elevation view, check if we need to create an elevation-only cuboid
        if (newView === "elevation" && !processedElement.isElevationOnly && !processedElement.hasElevationCuboid) {
          // Create a new cuboid that will only appear in elevation view
          const newElements = createElevationViewCuboid(processedElement, { currentView: newView });
          
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
  },
  keyTest: (event) =>
    event.altKey &&
    event.code === CODES.V &&
    !event[KEYS.CTRL_OR_CMD] &&
    !event.shiftKey,
});