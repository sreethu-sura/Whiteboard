import { updateBoundElements } from "./binding";
import type { Bounds } from "./bounds";
import { getCommonBounds, getElementBounds } from "./bounds";
import { mutateElement } from "./mutateElement";
import { getPerfectElementSize } from "./sizeHelpers";
import type { NonDeletedExcalidrawElement } from "./types";
import type {
  AppState,
  NormalizedZoomValue,
  NullableGridSize,
  PointerDownState,
} from "../types";
import { getBoundTextElement } from "./textElement";
import type Scene from "../scene/Scene";
import {
  isArrowElement,
  isElbowArrow,
  isFrameLikeElement,
  isImageElement,
  isTextElement,
} from "./typeChecks";
import { getFontString } from "../utils";
import { TEXT_AUTOWRAP_THRESHOLD } from "../constants";
import { getGridPoint } from "../snapping";
import { getMinTextElementWidth } from "./textMeasurements";

export const dragSelectedElements = (
  pointerDownState: PointerDownState,
  _selectedElements: NonDeletedExcalidrawElement[],
  offset: { x: number; y: number },
  scene: Scene,
  snapOffset: {
    x: number;
    y: number;
  },
  gridSize: NullableGridSize,
  appState?: AppState,
) => {
  // Reduce console spam to avoid performance impact
  // console.clear();
  // console.log("==== DRAGGING ELEMENTS ====");
  
  if (
    _selectedElements.length === 1 &&
    isElbowArrow(_selectedElements[0]) &&
    (_selectedElements[0].startBinding || _selectedElements[0].endBinding)
  ) {
    return;
  }

  const selectedElements = _selectedElements.filter((element) => {
    if (isElbowArrow(element) && element.startBinding && element.endBinding) {
      const startElement = _selectedElements.find(
        (el) => el.id === element.startBinding?.elementId,
      );
      const endElement = _selectedElements.find(
        (el) => el.id === element.endBinding?.elementId,
      );

      return startElement && endElement;
    }

    return true;
  });

  // we do not want a frame and its elements to be selected at the same time
  // but when it happens (due to some bug), we want to avoid updating element
  // in the frame twice, hence the use of set
  const elementsToUpdate = new Set<NonDeletedExcalidrawElement>(
    selectedElements,
  );
  const frames = selectedElements
    .filter((e) => isFrameLikeElement(e))
    .map((f) => f.id);

  if (frames.length > 0) {
    for (const element of scene.getNonDeletedElements()) {
      if (element.frameId !== null && frames.includes(element.frameId)) {
        elementsToUpdate.add(element);
      }
    }
  }

  const commonBounds = getCommonBounds(
    Array.from(elementsToUpdate).map(
      (el) => pointerDownState.originalElements.get(el.id) ?? el,
    ),
  );
  const adjustedOffset = calculateOffset(
    commonBounds,
    offset,
    snapOffset,
    gridSize,
  );

  // Handle insert mode if appState is provided and in insert mode
  if (appState?.insertModeEnabled) {
    // First update the positions of the dragged elements (without modifying other elements yet)
    elementsToUpdate.forEach((element) => {
      updateElementCoords(pointerDownState, element, adjustedOffset);
    });
    
    // Calculate the current bounds of the dragged elements after the update
    const elementsBounds = getCommonBounds(Array.from(elementsToUpdate));
    const [x1, y1, x2, y2] = elementsBounds;
    
    const elementsMap = scene.getElementsMapIncludingDeleted();
    const allElements = scene.getNonDeletedElements();
    
    // Find elements on the same row (with significant vertical overlap)
    const rowElements = allElements.filter(el => {
      // Skip elements being dragged
      if (elementsToUpdate.has(el)) return false;
      
      // Check for vertical overlap
      return hasVerticalOverlap(el, elementsMap, y1, y2);
    });
    
    // Organize elements by their position relative to the dragged elements
    const leftElements = rowElements.filter(el => {
      const [ex1, , ex2] = getElementBounds(el, elementsMap);
      const centerX = (ex1 + ex2) / 2;
      return centerX <= x1;
    });
    
    const rightElements = rowElements.filter(el => {
      const [ex1, , ex2] = getElementBounds(el, elementsMap);
      const centerX = (ex1 + ex2) / 2;
      return centerX > x1;
    });

    if (leftElements.length > 0) {
      // Find rightmost edge of left elements
      const rightmostLeftEdge = Math.max(
        ...leftElements.map(el => getElementBounds(el, elementsMap)[2])
      );
      
      // Calculate how much to move the dragged elements to align with the left boundary
      const leftAlignmentOffset = rightmostLeftEdge - x1;
      
      // Apply this offset to all dragged elements
      elementsToUpdate.forEach(element => {
        const newX = element.x + leftAlignmentOffset;
        mutateElement(element, { x: newX });
        
        // Also handle text elements bound to this element
        const textElement = getBoundTextElement(element, elementsMap);
        if (textElement) {
          mutateElement(textElement, { x: textElement.x + leftAlignmentOffset });
        }
      });
      
      // Get the new bounds after aligning with the left element
      const newBounds = getCommonBounds(Array.from(elementsToUpdate));
      const [_, __, newX2, ___] = newBounds;
      
      // Check if we need to adjust right elements
      if (rightElements.length > 0) {
        // Find leftmost edge of right elements
        const leftmostRightEdge = Math.min(
          ...rightElements.map(el => getElementBounds(el, elementsMap)[0])
        );
        
        // Check if our elements overlap with right elements after alignment
        const overlapAmount = Math.max(0, newX2 - leftmostRightEdge);
        
        // Only shift right elements if there's an overlap to create space
        if (overlapAmount > 0) {
          // Find if any right elements have already been shifted from their original position
          const alreadyShifted = rightElements.some(element => {
            const original = pointerDownState.originalElements.get(element.id);
            return original && element.x > original.x;
          });
          
          // We'll only apply a new shift or keep existing shift to avoid jittering
          const shiftAmount = overlapAmount;
          
          // Apply the shift to all right elements from their original positions
          rightElements.forEach(element => {
            const original = pointerDownState.originalElements.get(element.id) || element;
            mutateElement(element, { x: original.x + shiftAmount });
          });
        }
      }
      
      // Update bound elements for all modified elements
      const allModifiedElements = [
        ...Array.from(elementsToUpdate),
        ...rightElements
      ];
      
      allModifiedElements.forEach(element => {
        updateBoundElements(element, elementsMap, {
          simultaneouslyUpdated: allModifiedElements,
        });
      });
    } else {
      // If no left elements, just update bound elements for dragged elements
      elementsToUpdate.forEach(element => {
        if (!isArrowElement(element)) {
          updateBoundElements(element, elementsMap, {
            simultaneouslyUpdated: Array.from(elementsToUpdate),
          });
        }
      });
    }
  } else {
    // Normal drag behavior
    elementsToUpdate.forEach((element) => {
      updateElementCoords(pointerDownState, element, adjustedOffset);
      if (!isArrowElement(element)) {
        // skip arrow labels since we calculate its position during render
        const textElement = getBoundTextElement(
          element,
          scene.getElementsMapIncludingDeleted(),
        );
        if (textElement) {
          updateElementCoords(pointerDownState, textElement, adjustedOffset);
        }
        updateBoundElements(element, scene.getElementsMapIncludingDeleted(), {
          simultaneouslyUpdated: Array.from(elementsToUpdate),
        });
      }
    });
  }
};

// Helper function to restore elements to their original positions
const restoreShiftedElements = (
  elements: NonDeletedExcalidrawElement[],
  pointerDownState: PointerDownState,
) => {
  const hasShiftedElements = elements.some(element => {
    const original = pointerDownState.originalElements.get(element.id);
    return original && element.x !== original.x;
  });
  
  if (hasShiftedElements) {
    elements.forEach(element => {
      const original = pointerDownState.originalElements.get(element.id);
      if (original && element.x !== original.x) {
        mutateElement(element, { x: original.x });
      }
    });
  }
};

// Helper function to check if an element has meaningful vertical overlap with the inserted element
const hasVerticalOverlap = (
  element: NonDeletedExcalidrawElement,
  elementsMap: Map<string, NonDeletedExcalidrawElement>,
  y1: number,
  y2: number,
): boolean => {
  const [, ey1, , ey2] = getElementBounds(element, elementsMap);
  
  // Calculate vertical overlap
  const overlapTop = Math.max(y1, ey1);
  const overlapBottom = Math.min(y2, ey2);
  const verticalOverlapAmount = Math.max(0, overlapBottom - overlapTop);
  
  // For small elements, any overlap is significant
  const elementHeight = ey2 - ey1;
  const insertedHeight = y2 - y1;
  const minHeight = Math.min(elementHeight, insertedHeight);
  
  // Consider it a meaningful overlap if it's at least 25% of the smaller height
  return verticalOverlapAmount >= 0.25 * minHeight;
};

const calculateOffset = (
  commonBounds: Bounds,
  dragOffset: { x: number; y: number },
  snapOffset: { x: number; y: number },
  gridSize: NullableGridSize,
): { x: number; y: number } => {
  const [x, y] = commonBounds;
  let nextX = x + dragOffset.x + snapOffset.x;
  let nextY = y + dragOffset.y + snapOffset.y;

  if (snapOffset.x === 0 || snapOffset.y === 0) {
    const [nextGridX, nextGridY] = getGridPoint(
      x + dragOffset.x,
      y + dragOffset.y,
      gridSize,
    );

    if (snapOffset.x === 0) {
      nextX = nextGridX;
    }

    if (snapOffset.y === 0) {
      nextY = nextGridY;
    }
  }
  return {
    x: nextX - x,
    y: nextY - y,
  };
};

const updateElementCoords = (
  pointerDownState: PointerDownState,
  element: NonDeletedExcalidrawElement,
  dragOffset: { x: number; y: number },
) => {
  const originalElement =
    pointerDownState.originalElements.get(element.id) ?? element;

  const nextX = originalElement.x + dragOffset.x;
  const nextY = originalElement.y + dragOffset.y;

  mutateElement(element, {
    x: nextX,
    y: nextY,
  });
};

export const getDragOffsetXY = (
  selectedElements: NonDeletedExcalidrawElement[],
  x: number,
  y: number,
): [number, number] => {
  const [x1, y1] = getCommonBounds(selectedElements);
  return [x - x1, y - y1];
};

export const dragNewElement = ({
  newElement,
  elementType,
  originX,
  originY,
  x,
  y,
  width,
  height,
  shouldMaintainAspectRatio,
  shouldResizeFromCenter,
  zoom,
  widthAspectRatio = null,
  originOffset = null,
  informMutation = true,
}: {
  newElement: NonDeletedExcalidrawElement;
  elementType: AppState["activeTool"]["type"];
  originX: number;
  originY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shouldMaintainAspectRatio: boolean;
  shouldResizeFromCenter: boolean;
  zoom: NormalizedZoomValue;
  /** whether to keep given aspect ratio when `isResizeWithSidesSameLength` is
      true */
  widthAspectRatio?: number | null;
  originOffset?: {
    x: number;
    y: number;
  } | null;
  informMutation?: boolean;
}) => {
  if (shouldMaintainAspectRatio && newElement.type !== "selection") {
    if (widthAspectRatio) {
      height = width / widthAspectRatio;
    } else {
      // Depending on where the cursor is at (x, y) relative to where the starting point is
      // (originX, originY), we use ONLY width or height to control size increase.
      // This allows the cursor to always "stick" to one of the sides of the bounding box.
      if (Math.abs(y - originY) > Math.abs(x - originX)) {
        ({ width, height } = getPerfectElementSize(
          elementType,
          height,
          x < originX ? -width : width,
        ));
      } else {
        ({ width, height } = getPerfectElementSize(
          elementType,
          width,
          y < originY ? -height : height,
        ));
      }

      if (height < 0) {
        height = -height;
      }
    }
  }

  let newX = x < originX ? originX - width : originX;
  let newY = y < originY ? originY - height : originY;

  if (shouldResizeFromCenter) {
    width += width;
    height += height;
    newX = originX - width / 2;
    newY = originY - height / 2;
  }

  let textAutoResize = null;

  if (isTextElement(newElement)) {
    height = newElement.height;
    const minWidth = getMinTextElementWidth(
      getFontString({
        fontSize: newElement.fontSize,
        fontFamily: newElement.fontFamily,
      }),
      newElement.lineHeight,
    );
    width = Math.max(width, minWidth);

    if (Math.abs(x - originX) > TEXT_AUTOWRAP_THRESHOLD / zoom) {
      textAutoResize = {
        autoResize: false,
      };
    }

    newY = originY;
    if (shouldResizeFromCenter) {
      newX = originX - width / 2;
    }
  }

  if (width !== 0 && height !== 0) {
    let imageInitialDimension = null;
    if (isImageElement(newElement)) {
      imageInitialDimension = {
        initialWidth: width,
        initialHeight: height,
      };
    }

    mutateElement(
      newElement,
      {
        x: newX + (originOffset?.x ?? 0),
        y: newY + (originOffset?.y ?? 0),
        width,
        height,
        ...textAutoResize,
        ...imageInitialDimension,
      },
      informMutation,
    );
  }
};