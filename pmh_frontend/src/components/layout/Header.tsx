import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { APPROVED_LANGUAGES } from '@/lib/languages';
import logoImage from '@/assets/logo.png.png';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { language, setLanguage, t, isTranslating } = useLanguage();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard') },
    { path: '/support', label: t('nav.support') },
    { path: '/community', label: t('nav.community') },
    { path: '/feedback', label: t('nav.feedback') },
    { path: '/settings', label: t('nav.settings') },
  ];

  const currentLang = APPROVED_LANGUAGES.find((item) => item.code === language);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-2">
            <img src={logoImage} alt="Matria logo" className="h-10 w-10 object-contain drop-shadow-sm" />
            <span className="text-xl font-semibold text-foreground">
              MATR<span className="text-sage-500">IA</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-sage-100 text-sage-600'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="pill" size="sm" onClick={() => setIsLangOpen((value) => !value)} className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {currentLang?.flag} {currentLang?.label}
                </span>
                <span className="sm:hidden">{currentLang?.flag}</span>
                {isTranslating && <Loader2 className="h-3.5 w-3.5 animate-spin text-sage-600" />}
              </Button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 max-h-80 w-44 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
                  >
                    {APPROVED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${
                          language === lang.code ? 'bg-sage-50 text-sage-600' : ''
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen((value) => !value)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background lg:hidden"
          >
            <nav className="container flex flex-col gap-1 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-sage-100 text-sage-600'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
