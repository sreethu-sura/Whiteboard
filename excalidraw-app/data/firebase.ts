import type {
  ExcalidrawElement,
  FileId,
} from "../../packages/excalidraw/element/types";
import { getSceneVersion } from "../../packages/excalidraw/element";
import type {
  AppState,
} from "../../packages/excalidraw/types";
import type { SyncableExcalidrawElement } from ".";
import type { Socket } from "socket.io-client";

// Desktop app stubs
// -----------------------------------------------------------------------------

// All functions below are stubs for a desktop-only version

export const loadFirebaseStorage = async () => {
  return null;
};

class FirebaseSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();
  static get = (socket: Socket) => {
    return FirebaseSceneVersionCache.cache.get(socket);
  };
  static set = (
    socket: Socket,
    elements: readonly SyncableExcalidrawElement[],
  ) => {
    FirebaseSceneVersionCache.cache.set(socket, getSceneVersion(elements));
  };
}

export const isSavedToFirebase = (
  portal: { roomId: string; roomKey: string },
  elements: readonly ExcalidrawElement[],
): boolean => {
  return false;
};

export const saveFilesToFirebase = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  return {
    savedFiles: [],
    erroredFiles: [],
  };
};

export const saveToFirebase = async (
  portal: { roomId: string; roomKey: string },
  elements: readonly SyncableExcalidrawElement[],
  appState: AppState,
) => {
  return null;
};

export const loadFromFirebase = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly SyncableExcalidrawElement[] | null> => {
  return null;
};

export const loadFilesFromFirebase = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  return {
    loadedFiles: {},
    erroredFiles: new Map(),
  };
};
