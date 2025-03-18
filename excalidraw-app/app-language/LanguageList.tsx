import { useMemo } from "react";
import { useI18n } from "../../packages/excalidraw/i18n";
import { useAppLangCode } from "./language-state";

export const LanguageList = () => {
  const { t } = useI18n();
  const [langCode, setLangCode] = useAppLangCode();

  // Only show English option
  const options = useMemo(() => {
    return [
      {
        label: "English",
        value: "en",
      },
    ];
  }, []);

  return (
    <select
      className="dropdown-select dropdown-select__language"
      onChange={(event) => {
        setLangCode(event.target.value);
      }}
      value={langCode}
      aria-label={t("buttons.selectLanguage")}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
