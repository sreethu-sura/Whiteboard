import { useEffect, useRef, useState } from "react";
import { copyTextToSystemClipboard } from "../../packages/excalidraw/clipboard";
import { trackEvent } from "../../packages/excalidraw/analytics";
import { getFrame } from "../../packages/excalidraw/utils";
import { useI18n } from "../../packages/excalidraw/i18n";
import { KEYS } from "../../packages/excalidraw/keys";
import { Dialog } from "../../packages/excalidraw/components/Dialog";
import {
  copyIcon,
  LinkIcon,
  share,
  shareIOS,
  shareWindows,
} from "../../packages/excalidraw/components/icons";
import { TextField } from "../../packages/excalidraw/components/TextField";
import { FilledButton } from "../../packages/excalidraw/components/FilledButton";
import { useUIAppState } from "../../packages/excalidraw/context/ui-appState";
import { useCopyStatus } from "../../packages/excalidraw/hooks/useCopiedIndicator";
import { atom, useAtom } from "../app-jotai";

import "./ShareDialog.scss";

type OnExportToBackend = () => void;
type ShareDialogType = "share";

export const shareDialogStateAtom = atom<
  { isOpen: false } | { isOpen: true; type: ShareDialogType }
>({ isOpen: false });

const getShareIcon = () => {
  const navigator = window.navigator as any;
  const isAppleBrowser = /Apple/.test(navigator.vendor);
  const isWindowsBrowser = navigator.appVersion.indexOf("Win") !== -1;

  if (isAppleBrowser) {
    return shareIOS;
  } else if (isWindowsBrowser) {
    return shareWindows;
  }

  return share;
};

export type ShareDialogProps = {
  handleClose: () => void;
  onExportToBackend: OnExportToBackend;
  type: ShareDialogType;
};

const ShareDialogPicker = (props: ShareDialogProps) => {
  const { t } = useI18n();

  return (
    <>
      <div className="ShareDialog__picker__header">
        {t("exportDialog.link_title")}
      </div>
      <div className="ShareDialog__picker__description">
        {t("exportDialog.link_details")}
      </div>

      <div className="ShareDialog__picker__button">
        <FilledButton
          size="large"
          label={t("exportDialog.link_button")}
          icon={LinkIcon}
          onClick={async () => {
            await props.onExportToBackend();
            props.handleClose();
          }}
        />
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

export const ShareDialog = (props: {
  onExportToBackend: OnExportToBackend;
}) => {
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
      type={shareDialogState.type}
    />
  );
};
