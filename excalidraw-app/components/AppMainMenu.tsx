import React from "react";
import type { Theme } from "../../packages/excalidraw/element/types";
import { MainMenu } from "../../packages/excalidraw/index";
import { LanguageList } from "../app-language/LanguageList";

export const AppMainMenu: React.FC<{
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.DefaultItems.SaveToPdf />
      <MainMenu.DefaultItems.ExportToCsv />
      <MainMenu.DefaultItems.CommandPalette />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
