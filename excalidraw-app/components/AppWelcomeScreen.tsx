import React from "react";
import { useI18n } from "../../packages/excalidraw/i18n";
import { WelcomeScreen } from "../../packages/excalidraw/index";
import { ExcalidrawLogo } from "../../packages/excalidraw/components/ExcalidrawLogo";

export const AppWelcomeScreen: React.FC = React.memo(() => {
  const { t } = useI18n();
  const headingContent = t("welcomeScreen.app.center_heading");

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <div className="welcome-screen-center__logo excalifont welcome-screen-decor">
          <ExcalidrawLogo />
          <span className="custom-logo-text">Autosketch - PCR</span>
        </div>
        <WelcomeScreen.Center.Heading>
          {headingContent}
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});
