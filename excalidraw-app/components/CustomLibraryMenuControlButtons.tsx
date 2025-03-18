import React from "react";
import type {
  ExcalidrawProps,
  UIAppState,
} from "../../packages/excalidraw/types";
import clsx from "clsx";

/**
 * A custom version of LibraryMenuControlButtons without the browse button
 */
export const CustomLibraryMenuControlButtons = ({
  style,
  children,
  className,
}: {
  libraryReturnUrl?: ExcalidrawProps["libraryReturnUrl"];
  theme?: UIAppState["theme"];
  id?: string;
  style: React.CSSProperties;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={clsx("library-menu-control-buttons", className)}
      style={style}
    >
      {/* No browse button here */}
      {children}
    </div>
  );
};
