import { generateEncryptionKey } from "../../packages/excalidraw/data/encryption";
import type { ImportedDataState } from "../../packages/excalidraw/data/types";
import { isInvisiblySmallElement } from "../../packages/excalidraw/element/sizeHelpers";
import { isInitializedImageElement } from "../../packages/excalidraw/element/typeChecks";
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from "../../packages/excalidraw/element/types";
import type { AppState, BinaryFiles } from "../../packages/excalidraw/types";
import type { MakeBrand } from "../../packages/excalidraw/utility-types";
import { bytesToHexString } from "../../packages/excalidraw/utils";
import { ROOM_ID_BYTES } from "../app_constants";

export type SyncableExcalidrawElement = OrderedExcalidrawElement &
  MakeBrand<"SyncableExcalidrawElement">;

export const isSyncableElement = (
  element: OrderedExcalidrawElement,
): element is SyncableExcalidrawElement => {
  if (isInvisiblySmallElement(element)) {
    return false;
  }

  if (isInitializedImageElement(element) && element.status === "pending") {
    return false;
  }

  return true;
};

export const getSyncableElements = (
  elements: readonly OrderedExcalidrawElement[],
) =>
  elements.filter((element) =>
    isSyncableElement(element),
  ) as SyncableExcalidrawElement[];

const generateRoomId = async () => {
  const arr = new Uint8Array(ROOM_ID_BYTES);
  window.crypto.getRandomValues(arr);
  return bytesToHexString(arr);
};

export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

// All collaboration-related functions return dummy values as collaboration is disabled

export const isCollaborationLink = (link: string) => {
  return false;
};

export const getCollaborationLinkData = (link: string) => {
  return null;
};

export const generateCollaborationLinkData = async () => {
  const roomId = await generateRoomId();
  const roomKey = await generateEncryptionKey();

  return {
    roomId,
    roomKey,
  };
};

export const getCollaborationLink = (data: {
  roomId: string;
  roomKey: string;
}) => {
  return "";
};

export const loadScene = async (
  id: string | null,
  privateKey: string | null,
  localDataState: ImportedDataState | undefined | null,
) => {
  return {
    elements: localDataState?.elements || [],
    appState: localDataState?.appState || {},
    files: localDataState?.files || {},
  };
};

type ExportToBackendResult =
  | { url: null; errorMessage: string }
  | { url: string; errorMessage: null };

export const exportToBackend = async (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): Promise<ExportToBackendResult> => {
  return {
    url: null,
    errorMessage: "Exporting to backend is disabled in desktop mode",
  };
};
