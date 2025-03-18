import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../packages/excalidraw/i18n";
import { Dialog } from "../../packages/excalidraw/components/Dialog";
import { FilledButton } from "../../packages/excalidraw/components/FilledButton";
import { atom, useAtom } from "../app-jotai";

import "./ShareDialog.scss";

export const shareDialogStateAtom = atom<
  { isOpen: false } | { isOpen: true; type: "share" }
>({ isOpen: false });

export type ShareDialogProps = {
  handleClose: () => void;
  onExportToBackend: () => void;
  type: "share";
};

const ShareDialogPicker = (props: ShareDialogProps) => {
  const { t } = useI18n();

  return (
    <>
      <div className="ShareDialog__picker__header">
        {t("exportDialog.link_title")}
      </div>
      <div className="ShareDialog__picker__description">
        Export is currently disabled to prevent internet connections.
      </div>
    </>
  );
};

const ShareDialogInner = (props: ShareDialogProps) => {
  return (
    <Dialog size="small" onCloseRequest={props.handleClose} title={false}>
      <div className="ShareDialog">
        <ShareDialogPicker {...props} />
      </div>
    </Dialog>
  );
};

export const ShareDialog = (props: { onExportToBackend: () => void }) => {
  const [shareDialogState, setShareDialogState] = useAtom(shareDialogStateAtom);

  const handleClose = () => {
    setShareDialogState({ isOpen: false });
  };

  if (!shareDialogState.isOpen) {
    return null;
  }

  return (
    <ShareDialogInner
      handleClose={handleClose}
      onExportToBackend={props.onExportToBackend}
      type="share"
    />
  );
};
