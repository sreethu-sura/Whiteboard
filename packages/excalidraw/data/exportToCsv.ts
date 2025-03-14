import type {
    ExcalidrawLinearElement,
    ExcalidrawTextElement,
    NonDeletedExcalidrawElement,
} from "../element/types";
import type { AppState, BinaryFiles } from "../types";

export const exportToCsv = async (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
): Promise<Blob> => {
    // 1. Create a lookup for text elements: id -> originalText (or text)
    const textMap = new Map<string, string>();
    for (const element of elements) {
        if (element.type === "text") {
            const textEl = element as ExcalidrawTextElement;
            textMap.set(element.id, textEl.originalText ?? textEl.text ?? "");
        }
    }

    // 2. Build a map: elementId => set of connected shape IDs (ignoring arrows)
    const connections = new Map<string, Set<string>>();
    for (const element of elements) {
        if (element.type !== "arrow") {
            connections.set(element.id, new Set());
        }
    }

    // 3. Populate shape-to-shape connections by examining arrows
    for (const element of elements) {
        if (element.type === "arrow") {
            const arrow = element as ExcalidrawLinearElement;
            const startId = arrow.startBinding?.elementId;
            const endId = arrow.endBinding?.elementId;
            if (startId && endId) {
                if (connections.has(startId) && connections.has(endId)) {
                    connections.get(startId)!.add(endId);
                    connections.get(endId)!.add(startId);
                }
            }
        }
    }

    // 4. Define CSV columns (including angle & connectedto)
    const headers = [
        "id",
        "type",
        "boundText",   // text content bound to shape
        "x",
        "y",
        "width",
        "height",
        "angle",
        "connectedto",
    ];
    const csvRows = [headers.join(",")];

    // 5. Build each CSV row
    for (const element of elements) {
        if (element.isDeleted) {
            continue; // skip deleted
        }

        let boundTextVal = "";

        // If it's not text itself, let's see if it has bound text
        if (element.type !== "text" && element.boundElements?.length) {
            const foundTexts: string[] = [];
            for (const boundEl of element.boundElements) {
                if (boundEl.type === "text" && boundEl.id) {
                    // look up the text element
                    const text = textMap.get(boundEl.id);
                    if (text) {
                        foundTexts.push(text);
                    }
                }
            }
            boundTextVal = foundTexts.join("; ");
        }

        // Basic columns
        const rowData = [
            element.id,
            element.type,
            JSON.stringify(boundTextVal), // wrap in JSON.stringify to handle commas/newlines
            element.x,
            element.y,
            element.width,
            element.height,
            element.angle,
        ];

        // connectedto
        let connectedToStr = "";
        if (element.type !== "arrow") {
            const connectedIds = Array.from(connections.get(element.id) ?? []);
            connectedToStr = connectedIds.join(";");
        }
        rowData.push(connectedToStr);

        csvRows.push(rowData.join(","));
    }

    // 6. Create CSV blob
    const csvString = csvRows.join("\n");
    return new Blob([csvString], { type: "text/csv;charset=utf-8;" });
};
