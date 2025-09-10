import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../translations/en.json';
import hi from '../translations/hi.json';

const resources = {
  en: {
    translation: en
  },
  hi: {
    translation: hi
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
