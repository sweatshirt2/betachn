// i18next type augmentation (§8 law: all copy via typed Dict — a missing or
// misspelled t() key must be a COMPILE error, not a raw key on screen; this is
// what let nav.duties slip through before). react-i18next reads the same
// CustomTypeOptions for useTranslation()'s TFunction.
import 'i18next';
import type { Dict } from './dictionaries';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Dict;
    };
  }
}
