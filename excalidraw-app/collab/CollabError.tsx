import { Tooltip } from "../../packages/excalidraw/components/Tooltip";
import { warning } from "../../packages/excalidraw/components/icons";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { atom } from "../app-jotai";

import "./CollabError.scss";

export const collabErrorIndicatorAtom = atom<string | null>(null);

const CollabError = () => {
  return null;
};

export default CollabError;
