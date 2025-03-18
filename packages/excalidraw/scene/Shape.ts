import type { Point as RoughPoint } from "roughjs/bin/geometry";
import type { Drawable, Options } from "roughjs/bin/core";
import type { RoughGenerator } from "roughjs/bin/generator";
import { getDiamondPoints, getArrowheadPoints } from "../element";
import type { ElementShapes } from "./types";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  ExcalidrawSelectionElement,
  ExcalidrawLinearElement,
  ExcalidrawCuboidElement,
  Arrowhead,
} from "../element/types";
import { generateFreeDrawShape } from "../renderer/renderElement";
import { isTransparent, assertNever } from "../utils";
import { simplify } from "points-on-curve";
import { ROUGHNESS } from "../constants";
import {
  isElbowArrow,
  isEmbeddableElement,
  isIframeElement,
  isIframeLikeElement,
  isLinearElement,
} from "../element/typeChecks";
import { canChangeRoundness } from "./comparisons";
import type { EmbedsValidationStatus } from "../types";
import { pointFrom, pointDistance, type LocalPoint } from "../../math";
import { degreesToRadians } from "../../math/angle";
import { type Degrees, type Radians } from "../../math/types";
import { getCornerRadius, isPathALoop } from "../shapes";
import { headingForPointIsHorizontal } from "../element/heading";
import { newElement } from "../element/newElement";
import { nanoid } from "nanoid"; // Import nanoid

const getDashArrayDashed = (strokeWidth: number) => [8, 8 + strokeWidth];

const getDashArrayDotted = (strokeWidth: number) => [1.5, 6 + strokeWidth];

function adjustRoughness(element: ExcalidrawElement): number {
  const roughness = element.roughness;

  const maxSize = Math.max(element.width, element.height);
  const minSize = Math.min(element.width, element.height);

  // don't reduce roughness if
  if (
    // both sides relatively big
    (minSize >= 20 && maxSize >= 50) ||
    // is round & both sides above 15px
    (minSize >= 15 &&
      !!element.roundness &&
      canChangeRoundness(element.type)) ||
    // relatively long linear element
    (isLinearElement(element) && maxSize >= 50)
  ) {
    return roughness;
  }

  return Math.min(roughness / (maxSize < 10 ? 3 : 2), 2.5);
}

export const generateRoughOptions = (
  element: ExcalidrawElement,
  continuousPath = false,
): Options => {
  const options: Options = {
    seed: element.seed,
    strokeLineDash:
      element.strokeStyle === "dashed"
        ? getDashArrayDashed(element.strokeWidth)
        : element.strokeStyle === "dotted"
          ? getDashArrayDotted(element.strokeWidth)
          : undefined,
    // for non-solid strokes, disable multiStroke because it tends to make
    // dashes/dots overlay each other
    disableMultiStroke: element.strokeStyle !== "solid",
    // for non-solid strokes, increase the width a bit to make it visually
    // similar to solid strokes, because we're also disabling multiStroke
    strokeWidth:
      element.strokeStyle !== "solid"
        ? element.strokeWidth + 0.5
        : element.strokeWidth,
    // when increasing strokeWidth, we must explicitly set fillWeight and
    // hachureGap because if not specified, roughjs uses strokeWidth to
    // calculate them (and we don't want the fills to be modified)
    fillWeight: element.strokeWidth / 2,
    hachureGap: element.strokeWidth * 4,
    roughness: adjustRoughness(element),
    stroke: element.strokeColor,
    preserveVertices:
      continuousPath || element.roughness < ROUGHNESS.cartoonist,
  };

  switch (element.type) {
    case "rectangle":
    case "cuboid":
    case "iframe":
    case "embeddable":
    case "diamond":
    case "ellipse": {
      options.fillStyle = element.fillStyle;
      options.fill = isTransparent(element.backgroundColor)
        ? undefined
        : element.backgroundColor;
      if (element.type === "ellipse") {
        options.curveFitting = 1;
      }
      return options;
    }
    case "line":
    case "freedraw": {
      if (isPathALoop(element.points)) {
        options.fillStyle = element.fillStyle;
        options.fill =
          element.backgroundColor === "transparent"
            ? undefined
            : element.backgroundColor;
      }
      return options;
    }
    case "arrow":
      return options;
    default: {
      throw new Error(`Unimplemented type ${element.type}`);
    }
  }
};

const modifyIframeLikeForRoughOptions = (
  element: NonDeletedExcalidrawElement,
  isExporting: boolean,
  embedsValidationStatus: EmbedsValidationStatus | null,
) => {
  if (
    isIframeLikeElement(element) &&
    (isExporting ||
      (isEmbeddableElement(element) &&
        embedsValidationStatus?.get(element.id) !== true)) &&
    isTransparent(element.backgroundColor) &&
    isTransparent(element.strokeColor)
  ) {
    return {
      ...element,
      roughness: 0,
      backgroundColor: "#d3d3d3",
      fillStyle: "solid",
    } as const;
  } else if (isIframeElement(element)) {
    return {
      ...element,
      strokeColor: isTransparent(element.strokeColor)
        ? "#000000"
        : element.strokeColor,
      backgroundColor: isTransparent(element.backgroundColor)
        ? "#f4f4f6"
        : element.backgroundColor,
    };
  }
  return element;
};

const getArrowheadShapes = (
  element: ExcalidrawLinearElement,
  shape: Drawable[],
  position: "start" | "end",
  arrowhead: Arrowhead,
  generator: RoughGenerator,
  options: Options,
  canvasBackgroundColor: string,
) => {
  const arrowheadPoints = getArrowheadPoints(
    element,
    shape,
    position,
    arrowhead,
  );

  if (arrowheadPoints === null) {
    return [];
  }

  const generateCrowfootOne = (
    arrowheadPoints: number[] | null,
    options: Options,
  ) => {
    if (arrowheadPoints === null) {
      return [];
    }

    const [, , x3, y3, x4, y4] = arrowheadPoints;

    return [generator.line(x3, y3, x4, y4, options)];
  };

  switch (arrowhead) {
    case "dot":
    case "circle":
    case "circle_outline": {
      const [x, y, diameter] = arrowheadPoints;

      // always use solid stroke for arrowhead
      delete options.strokeLineDash;

      return [
        generator.circle(x, y, diameter, {
          ...options,
          fill:
            arrowhead === "circle_outline"
              ? canvasBackgroundColor
              : element.strokeColor,

          fillStyle: "solid",
          stroke: element.strokeColor,
          roughness: Math.min(0.5, options.roughness || 0),
        }),
      ];
    }
    case "triangle":
    case "triangle_outline": {
      const [x, y, x2, y2, x3, y3] = arrowheadPoints;

      // always use solid stroke for arrowhead
      delete options.strokeLineDash;

      return [
        generator.polygon(
          [
            [x, y],
            [x2, y2],
            [x3, y3],
            [x, y],
          ],
          {
            ...options,
            fill:
              arrowhead === "triangle_outline"
                ? canvasBackgroundColor
                : element.strokeColor,
            fillStyle: "solid",
            roughness: Math.min(1, options.roughness || 0),
          },
        ),
      ];
    }
    case "diamond":
    case "diamond_outline": {
      const [x, y, x2, y2, x3, y3, x4, y4] = arrowheadPoints;

      // always use solid stroke for arrowhead
      delete options.strokeLineDash;

      return [
        generator.polygon(
          [
            [x, y],
            [x2, y2],
            [x3, y3],
            [x4, y4],
            [x, y],
          ],
          {
            ...options,
            fill:
              arrowhead === "diamond_outline"
                ? canvasBackgroundColor
                : element.strokeColor,
            fillStyle: "solid",
            roughness: Math.min(1, options.roughness || 0),
          },
        ),
      ];
    }
    case "crowfoot_one":
      return generateCrowfootOne(arrowheadPoints, options);
    case "bar":
    case "arrow":
    case "crowfoot_many":
    case "crowfoot_one_or_many":
    default: {
      const [x2, y2, x3, y3, x4, y4] = arrowheadPoints;

      if (element.strokeStyle === "dotted") {
        // for dotted arrows caps, reduce gap to make it more legible
        const dash = getDashArrayDotted(element.strokeWidth - 1);
        options.strokeLineDash = [dash[0], dash[1] - 1];
      } else {
        // for solid/dashed, keep solid arrow cap
        delete options.strokeLineDash;
      }
      options.roughness = Math.min(1, options.roughness || 0);
      return [
        generator.line(x3, y3, x2, y2, options),
        generator.line(x4, y4, x2, y2, options),
        ...(arrowhead === "crowfoot_one_or_many"
          ? generateCrowfootOne(
            getArrowheadPoints(element, shape, position, "crowfoot_one"),
            options,
          )
          : []),
      ];
    }
  }
};

/**
 * Generates the roughjs shape for given element.
 *
 * Low-level. Use `ShapeCache.generateElementShape` instead.
 *
 * @private
 */
export const _generateElementShape = (
  element: Exclude<NonDeletedExcalidrawElement, ExcalidrawSelectionElement>,
  generator: RoughGenerator,
  {
    isExporting,
    canvasBackgroundColor,
    embedsValidationStatus,
  }: {
    isExporting: boolean;
    canvasBackgroundColor: string;
    embedsValidationStatus: EmbedsValidationStatus | null;
  },
): Drawable | Drawable[] | null => {
  switch (element.type) {
    case "rectangle":
    case "iframe":
    case "embeddable": {
      let shape: ElementShapes[typeof element.type];
      // this is for rendering the stroke/bg of the embeddable, especially
      // when the src url is not set

      if (element.roundness) {
        const w = element.width;
        const h = element.height;
        const r = getCornerRadius(Math.min(w, h), element);
        shape = generator.path(
          `M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r
          } Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r
          } L 0 ${r} Q 0 0, ${r} 0`,
          generateRoughOptions(
            modifyIframeLikeForRoughOptions(
              element,
              isExporting,
              embedsValidationStatus,
            ),
            true,
          ),
        );
      } else {
        shape = generator.rectangle(
          0,
          0,
          element.width,
          element.height,
          generateRoughOptions(
            modifyIframeLikeForRoughOptions(
              element,
              isExporting,
              embedsValidationStatus,
            ),
            false,
          ),
        );
      }
      return shape;
    }
    case "cuboid": {
      let shape: ElementShapes[typeof element.type];

      try {
        // Ensure we have default values if properties are missing
        const width = element.width > 0 ? element.width : 100;
        const height = element.height > 0 ? element.height : 100;
        const y = 0;

        // Generate the shape with the basic properties
        if (element.roundness) {
          const r = getCornerRadius(Math.min(width, height), element);
          shape = generator.path(
            `M ${r} ${y} L ${width - r} ${y} Q ${width} ${y}, ${width} ${y + r} L ${width} ${y + height - r
            } Q ${width} ${y + height}, ${width - r} ${y + height} L ${r} ${y + height} Q 0 ${y + height}, 0 ${y + height - r
            } L 0 ${y + r} Q 0 ${y}, ${r} ${y}`,
            generateRoughOptions(element, true),
          );
        } else {
          shape = generator.rectangle(
            0, 
            0, 
            width, 
            height, 
            generateRoughOptions(element, false)
          );
        }
        return shape;
      } catch (error) {
        console.error("Error generating cuboid shape:", error);
        // Fallback to a simple rectangle if there's an error
        return generator.rectangle(
          0,
          0,
          element.width || 100,
          element.height || 100,
          generateRoughOptions(element, false)
        );
      }
    }
    case "diamond": {
      let shape: ElementShapes[typeof element.type];

      const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
        getDiamondPoints(element);
      if (element.roundness) {
        const verticalRadius = getCornerRadius(Math.abs(topX - leftX), element);

        const horizontalRadius = getCornerRadius(
          Math.abs(rightY - topY),
          element,
        );

        shape = generator.path(
          `M ${topX + verticalRadius} ${topY + horizontalRadius} L ${rightX - verticalRadius
          } ${rightY - horizontalRadius}
            C ${rightX} ${rightY}, ${rightX} ${rightY}, ${rightX - verticalRadius
          } ${rightY + horizontalRadius}
            L ${bottomX + verticalRadius} ${bottomY - horizontalRadius}
            C ${bottomX} ${bottomY}, ${bottomX} ${bottomY}, ${bottomX - verticalRadius
          } ${bottomY - horizontalRadius}
            L ${leftX + verticalRadius} ${leftY + horizontalRadius}
            C ${leftX} ${leftY}, ${leftX} ${leftY}, ${leftX + verticalRadius} ${leftY - horizontalRadius
          }
            L ${topX - verticalRadius} ${topY + horizontalRadius}
            C ${topX} ${topY}, ${topX} ${topY}, ${topX + verticalRadius} ${topY + horizontalRadius
          }`,
          generateRoughOptions(element, true),
        );
      } else {
        shape = generator.polygon(
          [
            [topX, topY],
            [rightX, rightY],
            [bottomX, bottomY],
            [leftX, leftY],
          ],
          generateRoughOptions(element),
        );
      }
      return shape;
    }
    case "ellipse": {
      const shape: ElementShapes[typeof element.type] = generator.ellipse(
        element.width / 2,
        element.height / 2,
        element.width,
        element.height,
        generateRoughOptions(element),
      );
      return shape;
    }
    case "line":
    case "arrow": {
      let shape: ElementShapes[typeof element.type];
      const options = generateRoughOptions(element);

      // points array can be empty in the beginning, so it is important to add
      // initial position to it
      const points = element.points.length
        ? element.points
        : [pointFrom<LocalPoint>(0, 0)];

      if (isElbowArrow(element)) {
        shape = [
          generator.path(
            generateElbowArrowShape(points, 16),
            generateRoughOptions(element, true),
          ),
        ];
      } else if (!element.roundness) {
        // curve is always the first element
        // this simplifies finding the curve for an element
        if (options.fill) {
          shape = [
            generator.polygon(points as unknown as RoughPoint[], options),
          ];
        } else {
          shape = [
            generator.linearPath(points as unknown as RoughPoint[], options),
          ];
        }
      } else {
        shape = [generator.curve(points as unknown as RoughPoint[], options)];
      }

      // add lines only in arrow
      if (element.type === "arrow") {
        const { startArrowhead = null, endArrowhead = "arrow" } = element;

        if (startArrowhead !== null) {
          const shapes = getArrowheadShapes(
            element,
            shape,
            "start",
            startArrowhead,
            generator,
            options,
            canvasBackgroundColor,
          );
          shape.push(...shapes);
        }

        if (endArrowhead !== null) {
          if (endArrowhead === undefined) {
            // Hey, we have an old arrow here!
          }

          const shapes = getArrowheadShapes(
            element,
            shape,
            "end",
            endArrowhead,
            generator,
            options,
            canvasBackgroundColor,
          );
          shape.push(...shapes);
        }
      }
      return shape;
    }
    case "freedraw": {
      let shape: ElementShapes[typeof element.type];
      generateFreeDrawShape(element);

      if (isPathALoop(element.points)) {
        // generate rough polygon to fill freedraw shape
        const simplifiedPoints = simplify(element.points, 0.75);
        shape = generator.curve(simplifiedPoints as [number, number][], {
          ...generateRoughOptions(element),
          stroke: "none",
        });
      } else {
        shape = null;
      }
      return shape;
    }
    case "frame":
    case "magicframe":
    case "text":
    case "image": {
      const shape: ElementShapes[typeof element.type] = null;
      // we return (and cache) `null` to make sure we don't regenerate
      // `element.canvas` on rerenders
      return shape;
    }
    default: {
      assertNever(
        element,
        `generateElementShape(): Unimplemented type ${(element as any)?.type}`,
      );
      return null;
    }
  }
};

// Update the updateCuboidViewProperties function to be more robust
export const updateCuboidViewProperties = (
  element: ExcalidrawCuboidElement,
): ExcalidrawCuboidElement => {
  try {
    if (!element.currentView) {
      return element;
    }

    // Create a mutable copy of the element
    const updatedElement = { ...element };

    // Default heights for each view
    const DEFAULT_TOP_VIEW_HEIGHT = 250;
    const DEFAULT_ELEVATION_VIEW_HEIGHT = 350;

    // Check if this is the first time we're initializing the views
    const isFirstInitialization = !element.topView && !element.elevationView;

    if (element.currentView === "top") {
      try {
        // If switching from elevation to top view or initializing top view
        const oldHeight = element.height || DEFAULT_TOP_VIEW_HEIGHT;
        let newHeight;

        if (isFirstInitialization) {
          // If initializing for the first time, save the user's drawn dimensions
          newHeight = element.height || DEFAULT_TOP_VIEW_HEIGHT;
        } else if (!element.topView) {
          // If no top view exists yet (shouldn't happen with fixed code)
          newHeight = DEFAULT_TOP_VIEW_HEIGHT;
        } else {
          // Use previously saved top view height
          newHeight = element.topView.height || DEFAULT_TOP_VIEW_HEIGHT;
        }

        // Adjust y-coordinate to maintain the same bottom edge
        updatedElement.y = element.y + (oldHeight - newHeight);
        updatedElement.height = newHeight;

        // Store current dimensions in topView
        updatedElement.topView = {
          x: updatedElement.x,
          y: updatedElement.y,
          width: element.width || 100,
          height: newHeight, // Use the calculated height
        };

        // Initialize elevationView if it doesn't exist yet
        if (!element.elevationView) {
          updatedElement.elevationView = {
            x: updatedElement.x,
            y: updatedElement.y,
            width: element.width || 100,
            height: DEFAULT_ELEVATION_VIEW_HEIGHT,
          };
        }
      } catch (error) {
        console.error("Error updating cuboid top view properties:", error);
        // Keep using the current element properties if there's an error
      }
    } else if (element.currentView === "elevation") {
      try {
        // If switching from top to elevation view or initializing elevation view
        const oldHeight = element.height || DEFAULT_ELEVATION_VIEW_HEIGHT;
        let newHeight;

        if (isFirstInitialization) {
          // If initializing for the first time, save the user's drawn dimensions
          newHeight = element.height || DEFAULT_ELEVATION_VIEW_HEIGHT;
        } else if (!element.elevationView) {
          // If no elevation view exists yet (shouldn't happen with fixed code)
          newHeight = DEFAULT_ELEVATION_VIEW_HEIGHT;
        } else {
          // Use previously saved elevation view height
          newHeight = element.elevationView.height || DEFAULT_ELEVATION_VIEW_HEIGHT;
        }

        // Adjust y-coordinate to maintain the same bottom edge
        updatedElement.y = element.y + (oldHeight - newHeight);
        updatedElement.height = newHeight;

        // Store current dimensions in elevationView
        updatedElement.elevationView = {
          x: updatedElement.x,
          y: updatedElement.y,
          width: element.width || 100,
          height: newHeight, // Use the calculated height
        };

        // Initialize topView if it doesn't exist yet
        if (!element.topView) {
          updatedElement.topView = {
            x: updatedElement.x,
            y: updatedElement.y,
            width: element.width || 100,
            height: DEFAULT_TOP_VIEW_HEIGHT,
          };
        }
      } catch (error) {
        console.error("Error updating cuboid elevation view properties:", error);
        // Keep using the current element properties if there's an error
      }
    }

    return updatedElement;
  } catch (error) {
    console.error("Error in updateCuboidViewProperties:", error);
    return element;
  }
};

// Also creates 5 equally spaced horizontal lines inside the cuboid
export const createElevationViewCuboid = (
  originalElement: ExcalidrawCuboidElement,
  appState: { currentView: "top" | "elevation" },
): ExcalidrawElement[] => {
  try {
    // Calculate position for the new element (to the right of the original)
    const SPACING = 50; // Reasonable spacing
    const newX = originalElement.x + (originalElement.width || 100) + SPACING;

    // Use the elevation view dimensions if available, otherwise use defaults
    const width = originalElement.elevationView?.width || originalElement.width || 100;
    const height = originalElement.elevationView?.height || 350;

    // Calculate y position to align bottom edges
    // Bottom edge of original = originalElement.y + originalElement.height
    // For new element, we need y such that y + height = bottom edge of original
    const bottomEdge = originalElement.y + (originalElement.height || 100);
    const newY = bottomEdge - height;

    // Create a new cuboid element with elevation view dimensions
    const newCuboid: ExcalidrawElement = {
      ...originalElement,
      id: nanoid(), // Generate a new ID for the element
      x: newX,
      y: newY, // Use the calculated y to align bottom edges
      width: width,
      height: height,
      isElevationOnly: true, // Mark as elevation-only
      currentView: "elevation", // Set current view
      linkedElementId: originalElement.id, // Link to the original element
      angle: degreesToRadians(0 as Degrees),
    };

    // Create horizontal lines
    const lineElements: ExcalidrawElement[] = [];

    try {
      // Calculate the number of lines based on the height
      // For very small heights, we might want fewer lines
      const numLines = height < 100 ? 2 : 5;

      // Adjust spacing for the actual number of lines
      const adjustedSpacing = height / (numLines + 1);

      for (let i = 1; i <= numLines; i++) {
        const lineY = newY + i * adjustedSpacing;

        // Create a line element
        const lineElement: ExcalidrawLinearElement = {
          type: "line",
          id: nanoid(),
          x: newX + 1, // Start slightly inside the left edge of the cuboid
          y: lineY,
          width: width - 2, // Line width slightly less than cuboid width
          height: 0, // Horizontal line has no height
          isElevationOnly: true, // Only show in elevation view
          currentView: "elevation",
          strokeColor: originalElement.strokeColor || "#000000",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: (originalElement.strokeWidth || 1) / 2, // Thinner lines
          strokeStyle: "solid",
          roughness: originalElement.roughness || 1,
          opacity: originalElement.opacity || 100,
          points: [
            pointFrom<LocalPoint>(0, 0), // Start point (relative to x,y)
            pointFrom<LocalPoint>(width - 2, 0), // End point (relative to x,y)
          ],
          lastCommittedPoint: null,
          startBinding: null,
          endBinding: null,
          startArrowhead: null,
          endArrowhead: null,
          locked: false,
          link: null,
          frameId: null,
          roundness: null,
          boundElements: null,
          updated: Date.now(),
          seed: Math.random(),
          version: 1,
          versionNonce: 0,
          isDeleted: false,
          groupIds: [],
          angle: degreesToRadians(0 as Degrees),
          index: "0" as any, // Add the index property required by ExcalidrawLinearElement
        };

        lineElements.push(lineElement);
      }
    } catch (error) {
      console.error("Error creating elevation view lines:", error);
      // Continue without lines if there's an error
    }

    // Return the cuboid and all the line elements
    return [newCuboid, ...lineElements];
  } catch (error) {
    console.error("Error creating elevation view cuboid:", error);
    return []; // Return empty array if there's an error
  }
};

const generateElbowArrowShape = (
  points: readonly LocalPoint[],
  radius: number,
) => {
  const subpoints = [] as [number, number][];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const next = points[i + 1];
    const point = points[i];
    const prevIsHorizontal = headingForPointIsHorizontal(point, prev);
    const nextIsHorizontal = headingForPointIsHorizontal(next, point);
    const corner = Math.min(
      radius,
      pointDistance(points[i], next) / 2,
      pointDistance(points[i], prev) / 2,
    );

    if (prevIsHorizontal) {
      if (prev[0] < point[0]) {
        // LEFT
        subpoints.push([points[i][0] - corner, points[i][1]]);
      } else {
        // RIGHT
        subpoints.push([points[i][0] + corner, points[i][1]]);
      }
    } else if (prev[1] < point[1]) {
      // UP
      subpoints.push([points[i][0], points[i][1] - corner]);
    } else {
      subpoints.push([points[i][0], points[i][1] + corner]);
    }

    subpoints.push(points[i] as [number, number]);

    if (nextIsHorizontal) {
      if (next[0] < point[0]) {
        // LEFT
        subpoints.push([points[i][0] - corner, points[i][1]]);
      } else {
        // RIGHT
        subpoints.push([points[i][0] + corner, points[i][1]]);
      }
    } else if (next[1] < point[1]) {
      // UP
      subpoints.push([points[i][0], points[i][1] - corner]);
    } else {
      // DOWN
      subpoints.push([points[i][0], points[i][1] + corner]);
    }
  }

  const d = [`M ${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < subpoints.length; i += 3) {
    d.push(`L ${subpoints[i][0]} ${subpoints[i][1]}`);
    d.push(
      `Q ${subpoints[i + 1][0]} ${subpoints[i + 1][1]}, ${subpoints[i + 2][0]
      } ${subpoints[i + 2][1]}`,
    );
  }
  d.push(`L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`);

  return d.join(" ");
};
