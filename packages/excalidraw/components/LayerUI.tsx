import clsx from "clsx";
import React from "react";
import type { ActionManager } from "../actions/manager";
import {
  CLASSES,
  DEFAULT_SIDEBAR,
  LIBRARY_SIDEBAR_WIDTH,
  TOOL_TYPE,
} from "../constants";
import { showSelectedShapeActions } from "../element";
import type { NonDeletedExcalidrawElement } from "../element/types";
import type { Language } from "../i18n";
import { t } from "../i18n";
import { calculateScrollCenter } from "../scene";
import type {
  AppProps,
  AppState,
  ExcalidrawProps,
  BinaryFiles,
  UIAppState,
  AppClassProperties,
} from "../types";
import { capitalizeString, isShallowEqual } from "../utils";
import { SelectedShapeActions, ShapesSwitcher } from "./Actions";
import { ErrorDialog } from "./ErrorDialog";
import { ImageExportDialog } from "./ImageExportDialog";
import { FixedSideContainer } from "./FixedSideContainer";
import { HintViewer } from "./HintViewer";
import { Island } from "./Island";
import { LoadingMessage } from "./LoadingMessage";
import { LockButton } from "./LockButton";
import { PasteChartDialog } from "./PasteChartDialog";
import { Section } from "./Section";
import { HelpDialog } from "./HelpDialog";
import Stack from "./Stack";
import { UserList } from "./UserList";
import { JSONExportDialog } from "./JSONExportDialog";
import { PenModeButton } from "./PenModeButton";
import { trackEvent } from "../analytics";
import { useDevice } from "./App";
import Footer from "./footer/Footer";
import { isSidebarDockedAtom } from "./Sidebar/Sidebar";
import { useAtom, useAtomValue } from "../editor-jotai";
import MainMenu from "./main-menu/MainMenu";
import { ActiveConfirmDialog } from "./ActiveConfirmDialog";
import { OverwriteConfirmDialog } from "./OverwriteConfirm/OverwriteConfirm";
import { HandButton } from "./HandButton";
import { isHandToolActive } from "../appState";
import { TunnelsContext, useInitializeTunnels } from "../context/tunnels";
import { LibraryIcon } from "./icons";
import { DefaultSidebar } from "./DefaultSidebar";
import { EyeDropper, activeEyeDropperAtom } from "./EyeDropper";
import { mutateElement } from "../element/mutateElement";
import { ShapeCache } from "../scene/ShapeCache";
import Scene from "../scene/Scene";
import { LaserPointerButton } from "./LaserPointerButton";
import { TTDDialog } from "./TTDDialog/TTDDialog";
import { Stats } from "./Stats";
import { actionToggleStats } from "../actions/actionToggleStats";
import { actionToggleView } from "../actions/actionToggleView";
import { actionToggleMode } from "../actions/actionToggleMode";
import {
  TopViewIcon,
  ElevationViewIcon,
  InsertModeIcon,
  NormalModeIcon,
} from "./icons";
import { Tooltip } from "./Tooltip";
import ElementLinkDialog from "./ElementLinkDialog";
import { UIAppStateContext } from "../context/ui-appState";

import "./LayerUI.scss";
import "./Toolbar.scss";
import { DEFAULT_FONT_FAMILY } from "../constants";
import { FONT_FAMILY } from "../constants";

const viewToggleButtonStyles = `
.view-toggle-button {
  margin-right: 8px;
}

.view-toggle-button__button {
  display: flex;
  align-items: center;
  background: var(--color-surface-mid);
  border: none;
  box-shadow: 0 0 0 1px var(--color-surface-lowest);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  color: var(--text-primary-color);
  padding: 4px 8px;
  width: 100%;
  height: 100%;
}

.view-toggle-button__button:hover {
  background: var(--color-surface-high);
}

.view-toggle-button__button:active {
  box-shadow: 0 0 0 1px var(--color-brand-active);
}

.excalidraw.theme--dark .view-toggle-button__button {
  background: var(--color-surface-high);
}

.excalidraw.theme--dark .view-toggle-button__button:hover {
  background: #363541;
}

.view-toggle-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 4px;
}

.view-toggle-button__label {
  font-size: 0.8em;
}

@media (max-width: 640px) {
  .view-toggle-button__label {
    display: none;
  }
}
`;

if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = viewToggleButtonStyles;
  document.head.appendChild(styleElement);
}

interface LayerUIProps {
  actionManager: ActionManager;
  appState: UIAppState;
  files: BinaryFiles;
  canvas: HTMLCanvasElement;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  onLockToggle: () => void;
  onHandToolToggle: () => void;
  onPenModeToggle: AppClassProperties["togglePenMode"];
  showExitZenModeBtn: boolean;
  langCode: Language["code"];
  renderTopRightUI?: ExcalidrawProps["renderTopRightUI"];
  renderCustomStats?: ExcalidrawProps["renderCustomStats"];
  UIOptions: AppProps["UIOptions"];
  onExportImage: AppClassProperties["onExportImage"];
  renderWelcomeScreen: boolean;
  children?: React.ReactNode;
  app: AppClassProperties;
  isCollaborating: boolean;
  generateLinkForSelection?: AppProps["generateLinkForSelection"];
}

const DefaultMainMenu: React.FC<{
  UIOptions: AppProps["UIOptions"];
}> = ({ UIOptions }) => {
  return (
    <MainMenu __fallback>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.export && <MainMenu.DefaultItems.Export />}
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.saveAsImage && (
        <MainMenu.DefaultItems.SaveAsImage />
      )}
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.Group title="Excalidraw links">
        <MainMenu.DefaultItems.Socials />
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
};

const DefaultOverwriteConfirmDialog = () => {
  return (
    <OverwriteConfirmDialog __fallback>
      <OverwriteConfirmDialog.Actions.SaveToDisk />
      <OverwriteConfirmDialog.Actions.ExportToImage />
    </OverwriteConfirmDialog>
  );
};

const LayerUI = ({
  actionManager,
  appState,
  files,
  setAppState,
  elements,
  canvas,
  onLockToggle,
  onHandToolToggle,
  onPenModeToggle,
  showExitZenModeBtn,
  renderTopRightUI,
  renderCustomStats,
  UIOptions,
  onExportImage,
  renderWelcomeScreen,
  children,
  app,
  isCollaborating,
  generateLinkForSelection,
}: LayerUIProps) => {
  const device = useDevice();
  const tunnels = useInitializeTunnels();

  const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;

  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  const renderJSONExportDialog = () => {
    if (!UIOptions.canvasActions.export) {
      return null;
    }

    return (
      <JSONExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        exportOpts={UIOptions.canvasActions.export}
        canvas={canvas}
        setAppState={setAppState}
      />
    );
  };

  const renderImageExportDialog = () => {
    if (
      !UIOptions.canvasActions.saveAsImage ||
      appState.openDialog?.name !== "imageExport"
    ) {
      return null;
    }

    return (
      <ImageExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        onExportImage={onExportImage}
        onCloseRequest={() => setAppState({ openDialog: null })}
        name={app.getName()}
      />
    );
  };

  const renderCanvasActions = () => (
    <div style={{ position: "relative" }}>
      {/* wrapping to Fragment stops React from occasionally complaining
                about identical Keys */}
      <tunnels.MainMenuTunnel.Out />
      {renderWelcomeScreen && <tunnels.WelcomeScreenMenuHintTunnel.Out />}
    </div>
  );

  const renderSelectedShapeActions = () => (
    <Section
      heading="selectedShapeActions"
      className={clsx("selected-shape-actions zen-mode-transition", {
        "transition-left": appState.zenModeEnabled,
      })}
    >
      <Island
        className={CLASSES.SHAPE_ACTIONS_MENU}
        padding={2}
        style={{
          // we want to make sure this doesn't overflow so subtracting the
          // approximate height of hamburgerMenu + footer
          maxHeight: `${appState.height - 166}px`,
        }}
      >
        <SelectedShapeActions
          appState={appState}
          elementsMap={app.scene.getNonDeletedElementsMap()}
          renderAction={actionManager.renderAction}
          app={app}
        />
      </Island>
    </Section>
  );

  const renderFixedSideContainer = () => {
    const shouldRenderSelectedShapeActions = showSelectedShapeActions(
      appState,
      elements,
    );

    const shouldShowStats =
      appState.stats.open &&
      !appState.zenModeEnabled &&
      !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector";

    return (
      <FixedSideContainer side="top">
        <div className="App-menu App-menu_top">
          <Stack.Col gap={6} className={clsx("App-menu_top__left")}>
            {renderCanvasActions()}
            {shouldRenderSelectedShapeActions && renderSelectedShapeActions()}
          </Stack.Col>
          {!appState.viewModeEnabled &&
            appState.openDialog?.name !== "elementLinkSelector" && (
              <Section heading="shapes" className="shapes-section">
                {(heading: React.ReactNode) => (
                  <div style={{ position: "relative" }}>
                    {renderWelcomeScreen && (
                      <tunnels.WelcomeScreenToolbarHintTunnel.Out />
                    )}
                    <Stack.Col gap={4} align="start">
                      <Stack.Row
                        gap={1}
                        className={clsx("App-toolbar-container", {
                          "zen-mode": appState.zenModeEnabled,
                        })}
                      >
                        <Island
                          padding={1}
                          className={clsx("App-toolbar", {
                            "zen-mode": appState.zenModeEnabled,
                          })}
                        >
                          <HintViewer
                            appState={appState}
                            isMobile={device.editor.isMobile}
                            device={device}
                            app={app}
                          />
                          {heading}
                          <Stack.Row gap={1}>
                            <PenModeButton
                              zenModeEnabled={appState.zenModeEnabled}
                              checked={appState.penMode}
                              onChange={() => onPenModeToggle(null)}
                              title={t("toolBar.penMode")}
                              penDetected={appState.penDetected}
                            />
                            <LockButton
                              checked={appState.activeTool.locked}
                              onChange={onLockToggle}
                              title={t("toolBar.lock")}
                            />

                            <div className="App-toolbar__divider" />

                            <HandButton
                              checked={isHandToolActive(appState)}
                              onChange={() => onHandToolToggle()}
                              title={t("toolBar.hand")}
                              isMobile
                            />

                            <ShapesSwitcher
                              appState={appState}
                              activeTool={appState.activeTool}
                              UIOptions={UIOptions}
                              app={app}
                            />
                          </Stack.Row>
                        </Island>
                        {isCollaborating && (
                          <Island
                            style={{
                              marginLeft: 8,
                              alignSelf: "center",
                              height: "fit-content",
                            }}
                          >
                            <LaserPointerButton
                              title={t("toolBar.laser")}
                              checked={
                                appState.activeTool.type === TOOL_TYPE.laser
                              }
                              onChange={() =>
                                app.setActiveTool({ type: TOOL_TYPE.laser })
                              }
                              isMobile
                            />
                          </Island>
                        )}
                      </Stack.Row>
                    </Stack.Col>
                  </div>
                )}
              </Section>
            )}
          <div
            className={clsx(
              "layer-ui__wrapper__top-right zen-mode-transition",
              {
                "transition-right": appState.zenModeEnabled,
              },
            )}
          >
            {appState.collaborators.size > 0 && (
              <UserList
                collaborators={appState.collaborators}
                userToFollow={appState.userToFollow?.socketId || null}
              />
            )}
            {renderTopRightUI?.(device.editor.isMobile, appState)}

            {/* Toggle View Button */}
            <Tooltip label={t("labels.toggleView")}>
              <Island
                className="view-toggle-button"
                padding={0}
                style={{
                  background: "transparent",
                  borderColor: "transparent",
                  boxShadow: "none",
                }}
              >
                <button
                  className="view-toggle-button__button"
                  onClick={() => {
                    actionManager.executeAction(actionToggleView);
                  }}
                  title={t("labels.toggleView")}
                  aria-label={t("labels.toggleView")}
                  style={{
                    fontFamily: Object.entries(FONT_FAMILY).find(
                      ([key, value]) => value === 6,
                    )?.[0],
                  }}
                >
                  <div className="view-toggle-button__icon">
                    {appState.currentView === "top"
                      ? TopViewIcon
                      : ElevationViewIcon}
                  </div>
                  <span className="view-toggle-button__label">
                    {appState.currentView === "top"
                      ? t("labels.topView")
                      : t("labels.elevationView")}
                  </span>
                </button>
              </Island>
            </Tooltip>

            {/* Toggle Mode Button */}
            <Tooltip label={t("labels.toggleMode")}>
              <Island
                className="view-toggle-button"
                padding={0}
                style={{
                  background: "transparent",
                  borderColor: "transparent",
                  boxShadow: "none",
                }}
              >
                <button
                  className="view-toggle-button__button"
                  onClick={() => {
                    actionManager.executeAction(actionToggleMode);
                  }}
                  title={t("labels.toggleMode")}
                  aria-label={t("labels.toggleMode")}
                  style={{
                    fontFamily: Object.entries(FONT_FAMILY).find(
                      ([key, value]) => value === 6,
                    )?.[0],
                  }}
                >
                  <div className="view-toggle-button__icon">
                    {appState.insertModeEnabled
                      ? InsertModeIcon
                      : NormalModeIcon}
                  </div>
                  <span className="view-toggle-button__label">
                    {appState.insertModeEnabled
                      ? t("labels.insertMode")
                      : t("labels.normalMode")}
                  </span>
                </button>
              </Island>
            </Tooltip>

            {!appState.viewModeEnabled &&
              appState.openDialog?.name !== "elementLinkSelector" &&
              // hide button when sidebar docked
              (!isSidebarDocked ||
                appState.openSidebar?.name !== DEFAULT_SIDEBAR.name) && (
                <tunnels.DefaultSidebarTriggerTunnel.Out />
              )}
            {shouldShowStats && (
              <Stats
                app={app}
                onClose={() => {
                  actionManager.executeAction(actionToggleStats);
                }}
                renderCustomStats={renderCustomStats}
              />
            )}
          </div>
        </div>
      </FixedSideContainer>
    );
  };

  const renderSidebars = () => {
    return (
      <DefaultSidebar
        __fallback
        onDock={(docked) => {
          trackEvent(
            "sidebar",
            `toggleDock (${docked ? "dock" : "undock"})`,
            `(${device.editor.isMobile ? "mobile" : "desktop"})`,
          );
        }}
      />
    );
  };

  const isSidebarDocked = useAtomValue(isSidebarDockedAtom);

  const layerUIJSX = (
    <>
      {/* ------------------------- tunneled UI ---------------------------- */}
      {/* make sure we render host app components first so that we can detect
          them first on initial render to optimize layout shift */}
      {children}
      {/* render component fallbacks. Can be rendered anywhere as they'll be
          tunneled away. We only render tunneled components that actually
        have defaults when host do not render anything. */}
      <DefaultMainMenu UIOptions={UIOptions} />
      <DefaultSidebar.Trigger
        __fallback
        icon={LibraryIcon}
        title={capitalizeString(t("toolBar.libraryAndSearch"))}
        onToggle={(open) => {
          if (open) {
            trackEvent(
              "sidebar",
              `${DEFAULT_SIDEBAR.name} (open)`,
              `button (${device.editor.isMobile ? "mobile" : "desktop"})`,
            );
          }
        }}
        tab={DEFAULT_SIDEBAR.defaultTab}
      >
        {t("toolBar.libraryAndSearch")}
      </DefaultSidebar.Trigger>
      <DefaultOverwriteConfirmDialog />
      {appState.openDialog?.name === "ttd" && <TTDDialog __fallback />}
      {/* ------------------------------------------------------------------ */}

      {appState.isLoading && <LoadingMessage delay={250} />}
      {appState.errorMessage && (
        <ErrorDialog onClose={() => setAppState({ errorMessage: null })}>
          {appState.errorMessage}
        </ErrorDialog>
      )}
      {eyeDropperState && !device.editor.isMobile && (
        <EyeDropper
          colorPickerType={eyeDropperState.colorPickerType}
          onCancel={() => {
            setEyeDropperState(null);
          }}
          onChange={(colorPickerType, color, selectedElements, { altKey }) => {
            if (
              colorPickerType !== "elementBackground" &&
              colorPickerType !== "elementStroke"
            ) {
              return;
            }

            if (selectedElements.length) {
              for (const element of selectedElements) {
                mutateElement(
                  element,
                  {
                    [altKey && eyeDropperState.swapPreviewOnAlt
                      ? colorPickerType === "elementBackground"
                        ? "strokeColor"
                        : "backgroundColor"
                      : colorPickerType === "elementBackground"
                      ? "backgroundColor"
                      : "strokeColor"]: color,
                  },
                  false,
                );
                ShapeCache.delete(element);
              }
              Scene.getScene(selectedElements[0])?.triggerUpdate();
            } else if (colorPickerType === "elementBackground") {
              setAppState({
                currentItemBackgroundColor: color,
              });
            } else {
              setAppState({ currentItemStrokeColor: color });
            }
          }}
          onSelect={(color, event) => {
            setEyeDropperState((state) => {
              return state?.keepOpenOnAlt && event.altKey ? state : null;
            });
            eyeDropperState?.onSelect?.(color, event);
          }}
        />
      )}
      {appState.openDialog?.name === "help" && (
        <HelpDialog
          onClose={() => {
            setAppState({ openDialog: null });
          }}
        />
      )}
      <ActiveConfirmDialog />
      {appState.openDialog?.name === "elementLinkSelector" && (
        <ElementLinkDialog
          sourceElementId={appState.openDialog.sourceElementId}
          onClose={() => {
            setAppState({
              openDialog: null,
            });
          }}
          elementsMap={app.scene.getNonDeletedElementsMap()}
          appState={appState}
          generateLinkForSelection={generateLinkForSelection}
        />
      )}
      <tunnels.OverwriteConfirmDialogTunnel.Out />
      {renderImageExportDialog()}
      {renderJSONExportDialog()}
      {appState.pasteDialog.shown && (
        <PasteChartDialog
          setAppState={setAppState}
          appState={appState}
          onClose={() =>
            setAppState({
              pasteDialog: { shown: false, data: null },
            })
          }
        />
      )}

      {!device.editor.isMobile && (
        <>
          <div
            className="layer-ui__wrapper"
            style={
              appState.openSidebar &&
              isSidebarDocked &&
              device.editor.canFitSidebar
                ? { width: `calc(100% - ${LIBRARY_SIDEBAR_WIDTH}px)` }
                : {}
            }
          >
            {renderWelcomeScreen && <tunnels.WelcomeScreenCenterTunnel.Out />}
            {renderFixedSideContainer()}
            <Footer
              appState={appState}
              actionManager={actionManager}
              showExitZenModeBtn={showExitZenModeBtn}
              renderWelcomeScreen={renderWelcomeScreen}
            />
            {appState.scrolledOutside && (
              <button
                type="button"
                className="scroll-back-to-content"
                onClick={() => {
                  setAppState((appState) => ({
                    ...calculateScrollCenter(elements, appState),
                  }));
                }}
              >
                {t("buttons.scrollBackToContent")}
              </button>
            )}
          </div>
          {renderSidebars()}
        </>
      )}
    </>
  );

  return (
    <UIAppStateContext.Provider value={appState}>
      <TunnelsJotaiProvider>
        <TunnelsContext.Provider value={tunnels}>
          {layerUIJSX}
        </TunnelsContext.Provider>
      </TunnelsJotaiProvider>
    </UIAppStateContext.Provider>
  );
};

const stripIrrelevantAppStateProps = (appState: AppState): UIAppState => {
  const {
    suggestedBindings,
    startBoundElement,
    cursorButton,
    scrollX,
    scrollY,
    ...ret
  } = appState;
  return ret;
};

const areEqual = (prevProps: LayerUIProps, nextProps: LayerUIProps) => {
  // short-circuit early
  if (prevProps.children !== nextProps.children) {
    return false;
  }

  const { canvas: _pC, appState: prevAppState, ...prev } = prevProps;
  const { canvas: _nC, appState: nextAppState, ...next } = nextProps;

  return (
    isShallowEqual(
      // asserting AppState because we're being passed the whole AppState
      // but resolve to only the UI-relevant props
      stripIrrelevantAppStateProps(prevAppState as AppState),
      stripIrrelevantAppStateProps(nextAppState as AppState),
      {
        selectedElementIds: isShallowEqual,
        selectedGroupIds: isShallowEqual,
      },
    ) && isShallowEqual(prev, next)
  );
};

export default React.memo(LayerUI, areEqual);
