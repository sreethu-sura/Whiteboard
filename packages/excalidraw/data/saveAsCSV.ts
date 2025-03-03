// saveAsCSV.ts
import { fileSave } from "./filesystem";
import { serializeAsJSON } from "./json"; // or wherever serializeAsJSON is defined
import type { ExcalidrawElement } from "../element/types";
import type { AppState, BinaryFiles } from "../types";
import { DEFAULT_FILENAME } from "../constants";

/**
 * Converts Excalidraw JSON to CSV string, including:
 * - shape-to-shape connections via arrows
 * - text extraction for text elements
 */
const convertExcalidrawJsonToCsv = (jsonStr: string): string => {
  const data = JSON.parse(jsonStr);

  // Safety checks
  if (!data || !data.elements) {
    return "";
  }

  const elements = data.elements as ExcalidrawElement[];

  // ---------------------------------------------------------------------------
  // 1. Build a map of shapeID => Set of connected shapeIDs (ignoring arrows)
  //    We'll skip arrow elements themselves in the final connections,
  //    but we *use* them to figure out which shapes they connect.
  // ---------------------------------------------------------------------------
  const connectionsMap = new Map<string, Set<string>>();

  // Initialize only for non-arrow elements, so we only store shape connections
  for (const elem of elements) {
    if (elem.type !== "arrow") {
      connectionsMap.set(elem.id, new Set());
    }
  }

  // Now fill the connections by examining each arrow
  for (const elem of elements) {
    if (elem.type === "arrow") {
      const arrow = elem as any; // we'll assume arrow-like shape
      const startId = arrow.startBinding?.elementId;
      const endId = arrow.endBinding?.elementId;

      // If both ends are connected to shapes, connect them
      if (startId && endId) {
        if (connectionsMap.has(startId) && connectionsMap.has(endId)) {
          connectionsMap.get(startId)!.add(endId);
          connectionsMap.get(endId)!.add(startId);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Define CSV columns
  // ---------------------------------------------------------------------------
  const columns = [
    "id",
    "type",
    "x",
    "y",
    "width",
    "height",
    "angle",
    // We'll add two custom columns:
    "connectedTo",  // shape-to-shape connections
    "textContent",  // only for text elements
  ];

  // Create CSV header row
  const lines = [columns.join(",")];

  // ---------------------------------------------------------------------------
  // 3. Create CSV rows
  // ---------------------------------------------------------------------------
  for (const element of elements) {
    // We'll handle `connectedTo` differently for arrows vs shapes
    let connectedTo = "";
    if (element.type !== "arrow") {
      // For shapes, join the connected shape IDs with ";"
      const ids = connectionsMap.get(element.id);
      if (ids && ids.size > 0) {
        connectedTo = Array.from(ids).join(";");
      }
    }

    // For textContent, we only fill if it's a text element
    let textContent = "";
    if (element.type === "text") {
      // Safely wrap in JSON.stringify to handle commas/newlines
      textContent = JSON.stringify((element as any).text ?? "");
    }

    // Build row data
    const rowData = [
      element.id,
      element.type,
      element.x,
      element.y,
      element.width,
      element.height,
      element.angle,
      connectedTo,
      textContent,
    ];

    // Convert each cell to JSON-escaped string (to handle commas, quotes, etc.)
    const csvRow = rowData.map((cell) => JSON.stringify(cell ?? "")).join(",");
    lines.push(csvRow);
  }

  // Return joined rows (use \r\n for Windows compatibility)
  return lines.join("\r\n");
};

/**
 * Saves Excalidraw elements + appState as a CSV file
 */
export const saveAsCSV = async (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  name: string = appState.name || DEFAULT_FILENAME,
) => {
  // 1. Convert elements/appState/files into an Excalidraw JSON string
  const serializedJson = serializeAsJSON(elements, appState, files, "local");

  // 2. Convert that JSON to CSV
  const csvString = convertExcalidrawJsonToCsv(serializedJson);

  // 3. Create a Blob and invoke fileSave
  const blob = new Blob([csvString], {
    type: "text/csv;charset=utf-8",
  });

  const fileHandle = await fileSave(blob, {
    name,
    extension: "csv",
    description: "Excalidraw CSV",
  });

  return { fileHandle };
};
