import type { Language } from '@/contexts/LanguageContext';

export const APPROVED_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'ar', label: 'Arabic', flag: 'AR' },
  { code: 'pl', label: 'Polish', flag: 'PL' },
  { code: 'hi', label: 'Hindi', flag: 'HI' },
  { code: 'ur', label: 'Urdu', flag: 'UR' },
  { code: 'ta', label: 'Tamil', flag: 'TA' },
];
