import React from "react";
import type {
  ExcalidrawProps,
  UIAppState,
} from "../../packages/excalidraw/types";

/**
 * A custom version of LibraryMenuBrowseButton that renders nothing
 */
const CustomLibraryMenuBrowseButton = ({
  theme,
  id,
  libraryReturnUrl,
}: {
  libraryReturnUrl?: ExcalidrawProps["libraryReturnUrl"];
  theme?: UIAppState["theme"];
  id?: string;
}) => {
  // Return an empty div instead of the browse button
  return <div style={{ display: "none" }} />;
};

export default CustomLibraryMenuBrowseButton;
