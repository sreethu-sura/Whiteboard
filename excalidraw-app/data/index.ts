import {
  compressData,
  decompressData,
} from "../../packages/excalidraw/data/encode";
import {
  decryptData,
  generateEncryptionKey,
  IV_LENGTH_BYTES,
} from "../../packages/excalidraw/data/encryption";
import { serializeAsJSON } from "../../packages/excalidraw/data/json";
import { restore } from "../../packages/excalidraw/data/restore";
import type { ImportedDataState } from "../../packages/excalidraw/data/types";
import type { SceneBounds } from "../../packages/excalidraw/element/bounds";
import { isInvisiblySmallElement } from "../../packages/excalidraw/element/sizeHelpers";
import { isInitializedImageElement } from "../../packages/excalidraw/element/typeChecks";
import type {
  ExcalidrawElement,
  FileId,
  OrderedExcalidrawElement,
} from "../../packages/excalidraw/element/types";
import { t } from "../../packages/excalidraw/i18n";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  SocketId,
  UserIdleState,
} from "../../packages/excalidraw/types";
import type { MakeBrand } from "../../packages/excalidraw/utility-types";
import { bytesToHexString } from "../../packages/excalidraw/utils";
import type { WS_SUBTYPES } from "../app_constants";
import {
  DELETED_ELEMENT_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
  ROOM_ID_BYTES,
} from "../app_constants";
import { encodeFilesForUpload } from "./FileManager";

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

export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: WS_SUBTYPES.INVALID_RESPONSE;
  };
  SCENE_INIT: {
    type: WS_SUBTYPES.INIT;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  SCENE_UPDATE: {
    type: WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
  IDLE_STATUS: {
    type: WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming =
  SocketUpdateDataSource[keyof SocketUpdateDataSource];

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };

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
