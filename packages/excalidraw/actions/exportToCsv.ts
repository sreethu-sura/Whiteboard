import type { NonDeletedExcalidrawElement, ExcalidrawLinearElement } from "../element/types";
import type { AppState, BinaryFiles } from "../types";

export const exportToCsv = async (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
): Promise<Blob> => {
    // 1. Prepare a map of elementId => Set of connected element IDs
    const connections = new Map<string, Set<string>>();

    // Initialize the map so each *non-arrow* element has an empty set
    for (const element of elements) {
        if (element.type !== "arrow") {
            connections.set(element.id, new Set());
        }
    }

    // 2. Populate the connections by examining arrows only
    for (const element of elements) {
        if (element.type === "arrow") {
            const arrow = element as ExcalidrawLinearElement;

            const startId = arrow.startBinding?.elementId;
            const endId = arrow.endBinding?.elementId;

            // If both start and end are bound to shapes (non-arrow), connect them
            if (startId && endId) {
                if (connections.has(startId) && connections.has(endId)) {
                    connections.get(startId)?.add(endId);
                    connections.get(endId)?.add(startId);
                }
            }
        }
    }

    // 3. Define headers for the CSV
    const headers = ["id", "type", "text", "x", "y", "width", "height", "connectedTo"];
    const csvRows = [headers.join(",")];

    for (const element of elements) {
        // Basic fields (wrap text in JSON.stringify to handle commas/newlines)
        const baseData = [
            element.id,
            element.type,
            null,
            // JSON.stringify(element.text ?? ""),
            element.x,
            element.y,
            element.width,
            element.height,
        ];

        // 4. Determine the "connectedTo" value
        let connectedToStr = "";
        if (element.type !== "arrow") {
            const connectedIds = Array.from(connections.get(element.id) ?? []);
            connectedToStr = connectedIds.join(";");
        }

        baseData.push(connectedToStr);
        csvRows.push(baseData.join(","));
    }

    // 5. Create and return a CSV Blob
    const csvString = csvRows.join("\n");
    return new Blob([csvString], { type: "text/csv;charset=utf-8;" });
};
