import React from "react";
import { useTranslation } from "react-i18next";
import "./LanguageSwitcher.css";

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <span className="language-label">{t("common.language")}: </span>
      <div className="language-buttons">
        <button
          className={`language-button ${
            currentLanguage === "en" ? "active" : ""
          }`}
          onClick={() => changeLanguage("en")}
          aria-label={t("common.english")}
        >
          EN
        </button>
        <button
          className={`language-button ${
            currentLanguage === "fr" ? "active" : ""
          }`}
          onClick={() => changeLanguage("fr")}
          aria-label={t("common.french")}
        >
          FR
        </button>
      </div>
    </div>
  );
};
