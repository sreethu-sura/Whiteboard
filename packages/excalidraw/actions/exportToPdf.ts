import { ExcalidrawElement } from "../element/types";
import { AppState, BinaryFiles } from "../types";
import jsPDF from "jspdf";

export const exportToPdf = async (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
): Promise<Blob> => {
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [appState.width, appState.height],
    });

    // Directly draw elements to PDF
    elements.forEach(element => {
        switch (element.type) {
            case "rectangle":
                pdf.rect(element.x, element.y, element.width, element.height);
                break;
            // Add cases for other element types
        }
    });

    return pdf.output("blob");
};