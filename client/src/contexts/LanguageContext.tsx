import React, { createContext, useContext, useState } from "react";
import { useTranslation } from "react-i18next";

interface LanguageContextType {
  currentLanguage: string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState("en");

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === "en" ? "hi" : "en";
    setCurrentLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
