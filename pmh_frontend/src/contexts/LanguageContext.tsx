import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translateContent } from '@/lib/ai';

export type Language = 'en' | 'ar' | 'pl' | 'hi' | 'ta' | 'ur';

type TranslationEntry = Record<'en', string> & Partial<Record<Exclude<Language, 'en'>, string>>;

interface Translations {
  [key: string]: TranslationEntry;
}

export const translations: Translations = {
  'nav.dashboard': { en: 'Dashboard' },
  'nav.community': { en: 'Community' },
  'nav.support': { en: 'Services Directory' },
  'nav.chat': { en: 'Chat' },
  'nav.feedback': { en: 'Feedback' },
  'nav.settings': { en: 'Settings' },

  'landing.brand.tagline': { en: 'Perinatal mental health services directory' },
  'landing.badge': { en: 'Perinatal mental health services and resources' },
  'landing.hero.subtitle': {
    en: 'Directory of services for Perinatal Mental Health, find what types of support are available for you',
  },
  'landing.hero.cta': { en: 'Get Started' },
  'landing.intro.title': { en: 'Find perinatal mental health services and online resources.' },
  'landing.intro.body1': {
    en: 'Here you could find Wellbeing and mental health service providers and online resources available to women during or after pregnancy, and easy ways to choose better',
  },
  'landing.intro.body2': {
    en: 'Browse Sheffield and nationwide options, follow the service-location workflow, and save useful providers to your booklet.',
  },
  'landing.card.inclusive.title': { en: 'Inclusive care' },
  'landing.card.inclusive.desc': {
    en: 'A directory built to be useful for women from different ethnic, cultural, language, and community backgrounds.',
  },
  'landing.card.accessible.title': { en: 'Accessible directory' },
  'landing.card.accessible.desc': {
    en: 'A collection of available service providers based on the Sheffield area and some nationwide',
  },
  'landing.card.cultural.title': { en: 'Culturally aware' },
  'landing.card.cultural.desc': {
    en: 'Includes resources that are relevant to different communities, family situations, and lived experiences.',
  },
  'landing.support.modes': {
    en: 'Search by Sheffield or UK-wide availability, then narrow by phone, email, online, or social access',
  },
  'landing.quote': {
    en: 'MATRIA brings together Sheffield and nationwide service options so women can compare what is available more easily.',
  },
  'landing.why.title': { en: 'Why this matters' },
  'landing.why.desc': {
    en: 'Women during or after pregnancy often need clearer signposting to mental health services, wellbeing support, and online resources. MATRIA is being shaped as a practical directory to make those options easier to find.',
  },
  'landing.firstStep.title': { en: 'How MATRIA helps' },
  'landing.firstStep.desc': {
    en: 'Use the resource finder to choose Sheffield or UK-wide services, narrow by contact method, save favourites to your booklet, and keep a simple view of the available options.',
  },

  'crisis.title': { en: 'Need immediate help?' },
  'crisis.cta': { en: 'Crisis Support' },

  'auth.login': { en: 'Sign In' },
  'auth.signup': { en: 'Create Account' },
  'auth.guest': { en: 'Continue as Guest' },
  'entry.guest.desc': { en: 'Browse services and online resources without creating an account.' },
  'entry.account.desc': { en: 'Create a profile with a nickname to save language and booklet preferences.' },
  'entry.privacy.note': { en: 'Your real name is never required. Your data stays private.' },
  'entry.urgent.title': { en: 'Need urgent help right now?' },
  'entry.urgent.111': { en: 'Phone 111 and select the mental health option' },
  'entry.urgent.samaritans': { en: 'Phone Samaritans on 116 123' },
  'entry.urgent.eyup': { en: 'Text EYUP to 85258' },
  'entry.form.desc': { en: 'Only a nickname, email, and password are required.' },
  'entry.form.nickname': { en: 'Nickname' },
  'entry.form.nickname.placeholder': { en: 'Choose a nickname...' },
  'entry.form.nickname.hint': { en: 'This is how others will see you. Not your real name.' },
  'entry.form.email.placeholder': { en: 'your@email.com' },
  'entry.form.language': { en: 'Preferred Language' },
  'entry.form.privacy': {
    en: 'Your data is encrypted and never shared with third parties. You can delete your account at any time.',
  },
  'entry.login.link': { en: 'Already have an account? Sign in' },
  'entry.login.desc': { en: 'Welcome back. Sign in to continue.' },
  'entry.has.account': { en: 'Already have an account?' },
  'entry.no.account': { en: "Don't have an account?" },

  'input.title': { en: 'What resources are you looking for?' },
  'input.subtitle': { en: 'Choose how you want to search the service directory.' },
  'input.text.title': { en: 'Type a brief description of the required support, in a few words' },
  'input.text.desc': {
    en: 'Use short keywords such as anxiety, birth trauma, sleep, partner support, South-Asian, or Sheffield.',
  },
  'input.text.help': {
    en: 'Use short keywords. The directory will match them to services and online resources for testing.',
  },
  'input.text.placeholder': {
    en: 'For example: anxiety, Sheffield, phone support, South-Asian women, birth trauma, sleep...',
  },
  'input.guided.title': { en: 'Filter the resources by answering a few questions' },
  'input.guided.desc': { en: 'Follow the Sheffield or UK workflow to narrow the directory.' },
  'input.ai.label': { en: 'Keyword matching uses the current directory workflow.' },
  'input.continue': { en: 'Find resources' },
  'input.workflow.location.title': { en: 'Are you looking for:' },
  'input.workflow.location.desc': { en: 'Start by choosing where the service should be available.' },
  'input.workflow.location.sheffield': { en: 'Support Available in Sheffield' },
  'input.workflow.location.uk': { en: 'Support Available in the UK' },
  'input.workflow.sheffield.title': { en: 'How would you like to access Sheffield services?' },
  'input.workflow.sheffield.desc': { en: 'Choose the branch shown in the supplied workflow.' },
  'input.workflow.sheffield.phone_email': { en: 'Contact Services by (Phone or Email)' },
  'input.workflow.sheffield.online': { en: 'In Your Own Pace (Online)' },
  'input.workflow.sheffield.social': { en: 'Social Media' },
  'input.workflow.social.title': { en: 'Which social media route do you prefer?' },
  'input.workflow.social.desc': { en: 'Choose the final branch from the Sheffield social media workflow.' },
  'input.workflow.social.apps': { en: 'Apps' },
  'input.workflow.social.facebook': { en: 'Facebook' },
  'input.workflow.social.x': { en: 'X' },
  'input.workflow.uk.title': { en: 'How would you like to access UK-wide services?' },
  'input.workflow.uk.desc': { en: 'Choose email, phone, or online resources.' },
  'input.workflow.uk.email': { en: 'Email' },
  'input.workflow.uk.phone': { en: 'Phone' },
  'input.workflow.uk.online': { en: 'Online' },
  'input.crisis.title': { en: 'Immediate support recommended' },
  'input.crisis.directory': { en: 'Open Services Directory' },

  'onboarding.skip': { en: 'Skip for now' },
  'onboarding.next': { en: 'Next' },
  'onboarding.multi.hint': { en: 'You can choose more than one where available.' },

  'dashboard.welcome': { en: 'Directory overview' },
  'dashboard.welcome.desc': {
    en: 'Browse suggested services if you completed the resource finder, or open the full directory at any time.',
  },
  'dashboard.services': { en: 'Suggested Services and Resources' },
  'dashboard.community': { en: 'Community Highlights' },
  'dashboard.viewAll': { en: 'View all' },
  'dashboard.contactDetails': { en: 'Contact Details' },

  'community.title': { en: 'Community' },
  'community.post.placeholder': { en: "Share what's on your mind..." },
  'community.post.anonymous': { en: 'Post anonymously' },

  'directory.title': { en: 'Services and Resources Directory' },
  'directory.search': { en: 'Search services and resources...' },
  'directory.recommended': { en: 'Matched Services and Resources' },
  'directory.filter.language': { en: 'Language' },
  'directory.filter.type': { en: 'Service Type' },
  'directory.filter.mode': { en: 'Access Mode' },
  'directory.why': { en: 'Why this result?' },

  'feedback.subtitle': { en: 'Your feedback helps improve the directory experience.' },
  'feedback.type': { en: 'What would you like to share?' },
  'feedback.message': { en: 'Your message' },
  'feedback.placeholder': { en: 'Share your thoughts or suggestions...' },
  'feedback.anonymous': { en: 'Submit anonymously' },
  'feedback.submit': { en: 'Send Feedback' },
  'feedback.thanks.title': { en: 'Thank you for sharing' },
  'feedback.thanks.desc': { en: 'Your feedback helps us improve MATRIA.' },
  'feedback.another': { en: 'Share more feedback' },

  'settings.privacy': { en: 'Privacy & Safety' },
  'settings.privacy.desc': { en: 'Control who can see and contact you' },
  'settings.notifications': { en: 'Notifications' },
  'settings.notifications.desc': { en: 'Manage your notification preferences' },
  'settings.language': { en: 'Language' },
  'settings.language.desc': { en: 'Change your preferred language' },
  'settings.signout': { en: 'Sign Out' },

  'chat.title': { en: 'AI Support Chat' },
  'chat.subtitle': { en: 'Beta feature. Not part of the current client-facing workflow.' },
  'chat.openDirectory': { en: 'Open Services Directory' },
  'chat.safety.title': { en: 'Beta safety boundary' },
  'chat.safety.body': {
    en: 'This beta chat can offer general support wording, but it is not the main MATRIA workflow and does not diagnose or replace professional care.',
  },
  'chat.urgent.title': { en: 'Urgent support recommended' },
  'chat.urgent.body': {
    en: 'If there is immediate danger, contact local emergency services now.',
  },
  'chat.new': { en: 'Start New Chat' },
  'chat.disclaimer': { en: 'Supportive guidance only. This beta chat is not source-grounded.' },
  'chat.thinking': { en: 'Preparing a reply...' },
  'chat.placeholder': { en: 'Share what is on your mind. Shift+Enter for a new line.' },
  'chat.paused': { en: 'Chat input is paused while the safety response is active.' },
  'chat.helper': { en: 'This beta chat is secondary to the services directory.' },
  'chat.send': { en: 'Send' },
  'chat.error': { en: 'Could not send chat message' },
  'chat.capabilities.title': { en: 'What this can do' },
  'chat.capabilities.one': { en: 'Offer general reflection prompts.' },
  'chat.capabilities.two': { en: 'Suggest the services directory as the main next step.' },
  'chat.capabilities.three': { en: 'Reply in your selected app language when possible.' },
  'chat.greeting': { en: 'This beta chat is secondary to the services directory. Tell me briefly what you need.' },

  'common.loading': { en: 'Loading...' },
  'common.save': { en: 'Save' },
  'common.cancel': { en: 'Cancel' },
  'common.back': { en: 'Back' },
};

type RuntimeTranslationMap = Record<string, string>;

const RUNTIME_LANGUAGES: Language[] = ['ar', 'pl', 'hi', 'ta', 'ur'];
const UI_TRANSLATION_CACHE_PREFIX = 'matria.ui-translations';
const UI_TRANSLATION_CACHE_VERSION = '2026-04-28-directory-v1';

function isRuntimeLanguage(language: Language): boolean {
  return RUNTIME_LANGUAGES.includes(language);
}

function getUiTranslationCacheKey(language: Language): string {
  return `${UI_TRANSLATION_CACHE_PREFIX}.${language}.${UI_TRANSLATION_CACHE_VERSION}`;
}

function readUiTranslationCache(language: Language): RuntimeTranslationMap | null {
  try {
    const raw = window.localStorage.getItem(getUiTranslationCacheKey(language));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RuntimeTranslationMap;
  } catch {
    return null;
  }
}

function writeUiTranslationCache(language: Language, translationsMap: RuntimeTranslationMap): void {
  try {
    window.localStorage.setItem(getUiTranslationCacheKey(language), JSON.stringify(translationsMap));
  } catch {
    // Ignore localStorage write failures.
  }
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [runtimeTranslations, setRuntimeTranslations] = useState<Partial<Record<Language, RuntimeTranslationMap>>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    document.documentElement.dir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!isRuntimeLanguage(language)) {
      setIsTranslating(false);
      return;
    }

    const cachedTranslations = readUiTranslationCache(language);
    if (cachedTranslations) {
      setRuntimeTranslations((current) => ({ ...current, [language]: cachedTranslations }));
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    const loadRuntimeTranslations = async () => {
      try {
        const items = Object.entries(translations).map(([key, entry]) => ({
          key,
          text: entry.en,
          source_language: 'en',
        }));

        const response = await translateContent({
          items,
          target_language: language,
          provider_preference: 'google',
        });

        if (cancelled) {
          return;
        }

        const translatedMap = response.items.reduce<RuntimeTranslationMap>((accumulator, item) => {
          accumulator[item.key] = item.translated_text;
          return accumulator;
        }, {});

        writeUiTranslationCache(language, translatedMap);
        setRuntimeTranslations((current) => ({ ...current, [language]: translatedMap }));
      } catch (error) {
        console.error('Could not load runtime UI translations', error);
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    void loadRuntimeTranslations();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation: ${key}`);
      return key;
    }

    if (isRuntimeLanguage(language)) {
      const runtimeTranslation = runtimeTranslations[language]?.[key];
      if (runtimeTranslation) {
        return runtimeTranslation;
      }
    }

    return translation[language] || translation.en || key;
  }, [language, runtimeTranslations]);

  const isRTL = language === 'ar' || language === 'ur';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
