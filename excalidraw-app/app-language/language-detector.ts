import LanguageDetector from "i18next-browser-languagedetector";
import { defaultLang, languages } from "../../packages/excalidraw";

export const languageDetector = new LanguageDetector();

languageDetector.init({
  languageUtils: {},
});

export const getPreferredLanguage = () => {
  // Always return English
  return "en";
};
