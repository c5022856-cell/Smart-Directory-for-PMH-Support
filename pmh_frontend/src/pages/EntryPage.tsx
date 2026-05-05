import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, UserCircle, ArrowRight, Users, Languages, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CrisisFooter } from '@/components/layout/CrisisFooter';
import { APPROVED_LANGUAGES } from '@/lib/languages';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.png.png';

type FormView = 'options' | 'signup' | 'login';

export default function EntryPage() {
  const { t, language, setLanguage, isRTL, isTranslating } = useLanguage();
  const { signUp, signIn, setGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<FormView>('options');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [urgentHelpOpen, setUrgentHelpOpen] = useState(false);

  const resetAuthFields = () => {
    setNickname('');
    setEmail('');
    setPassword('');
  };

  const changeView = (nextView: FormView) => {
    resetAuthFields();
    setView(nextView);
  };

  useEffect(() => {
    const requestedView = searchParams.get('view');
    setNickname('');
    setEmail('');
    setPassword('');

    if (requestedView === 'signup' || requestedView === 'login') {
      setView(requestedView);
      return;
    }

    setView('options');
  }, [searchParams]);

  const handleGuest = () => {
    setGuest(true);
    navigate('/support-input');
  };

  const handleSignUp = async () => {
    if (!nickname.trim() || !email.trim() || !password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, {
      full_name: nickname,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email to verify, then sign in.');
      resetAuthFields();
      setView('login');
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      navigate('/support-input');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-400';

  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <div className="flex justify-end p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full border border-border/50 bg-card px-5 py-6 shadow-sm">
              <Languages className="mr-2 h-4 w-4" />
              {APPROVED_LANGUAGES.find((lang) => lang.code === language)?.label ?? 'Language'}
              {isTranslating && <Loader2 className="ml-2 h-4 w-4 animate-spin text-sage-600" />}
              <ChevronDown className={`h-4 w-4 ${isRTL ? 'mr-2 ml-0' : 'ml-2'}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44 rounded-2xl border-border/50 bg-card">
            {APPROVED_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`cursor-pointer rounded-xl ${
                  language === lang.code ? 'bg-sage-50 text-sage-700 focus:bg-sage-50 focus:text-sage-700' : ''
                }`}
              >
                <span className="mr-2 text-xs font-semibold text-sage-600">{lang.flag}</span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="mx-auto mb-4 h-24 w-24"
            >
              <img src={logoImage} alt="Matria logo" className="h-full w-full object-contain drop-shadow-lg" />
            </motion.div>
            <h1 className="mb-2 text-display-sm font-bold text-foreground">MATRIA</h1>
            <p className="text-body-md text-muted-foreground">{t('landing.hero.subtitle')}</p>
          </div>

          {view === 'options' && (
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="overflow-hidden rounded-3xl border border-[#f1d1c8] bg-white/85 shadow-sm">
                <button
                  type="button"
                  aria-expanded={urgentHelpOpen}
                  onClick={() => setUrgentHelpOpen((isOpen) => !isOpen)}
                  className="flex w-full items-center justify-between gap-3 p-5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-[#fff3ef]"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#c86d52]" />
                    <span>{t('entry.urgent.title')}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#c86d52] transition-transform ${urgentHelpOpen ? 'rotate-180' : ''}`} />
                </button>
                {urgentHelpOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 px-5 pb-5 text-sm text-muted-foreground"
                  >
                    <p>{t('entry.urgent.111')}</p>
                    <p>{t('entry.urgent.samaritans')}</p>
                    <p>{t('entry.urgent.eyup')}</p>
                  </motion.div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <button onClick={handleGuest} className="w-full cursor-pointer text-left transition-all hover:shadow-lg card-elevated p-5 group">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sage-100 transition-colors group-hover:bg-sage-200">
                      <Users className="h-6 w-6 text-sage-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-foreground">{t('auth.guest')}</h3>
                      <p className="text-sm text-muted-foreground">{t('entry.guest.desc')}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <button onClick={() => changeView('signup')} className="w-full cursor-pointer text-left transition-all hover:shadow-lg card-elevated p-5 group">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blush-100 transition-colors group-hover:bg-blush-200">
                      <UserCircle className="h-6 w-6 text-blush-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold text-foreground">{t('auth.signup')}</h3>
                      <p className="text-sm text-muted-foreground">{t('entry.account.desc')}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-sage-500" />
                <span>{t('entry.privacy.note')}</span>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <button onClick={() => changeView('login')} className="w-full pt-2 text-center text-sm font-medium text-sage-600 hover:underline">
                  {t('entry.login.link')}
                </button>
              </motion.div>
            </div>
          )}

          {view === 'signup' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6">
              <h3 className="mb-2 text-heading-md font-semibold text-foreground">{t('auth.signup')}</h3>
              <p className="mb-6 text-sm text-muted-foreground">{t('entry.form.desc')}</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{t('entry.form.nickname')} *</label>
                  <input
                    type="text"
                    name="matria-signup-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t('entry.form.nickname.placeholder')}
                    autoComplete="off"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t('entry.form.nickname.hint')}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Email *</label>
                  <input
                    type="email"
                    name="matria-signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('entry.form.email.placeholder')}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Password *</label>
                  <input
                    type="password"
                    name="matria-signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">{t('entry.form.language')}</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {APPROVED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm transition-colors ${
                          language === lang.code
                            ? 'border-sage-400 bg-sage-50 font-medium text-sage-600'
                            : 'border-border text-muted-foreground hover:border-sage-200'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-sage-50 p-3 text-sm">
                  <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage-500" />
                  <span className="text-sage-700">{t('entry.form.privacy')}</span>
                </div>

                <Button variant="hero" size="lg" className="w-full gap-2" disabled={loading} onClick={handleSignUp}>
                  {loading ? 'Creating account...' : t('auth.signup')}
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <div className="flex justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('entry.has.account')}</span>
                  <button onClick={() => changeView('login')} className="font-medium text-sage-600 hover:underline">
                    {t('auth.login')}
                  </button>
                </div>
                <button onClick={() => changeView('options')} className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('common.back')}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6">
              <h3 className="mb-2 text-heading-md font-semibold text-foreground">{t('auth.login')}</h3>
              <p className="mb-6 text-sm text-muted-foreground">{t('entry.login.desc')}</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    name="matria-login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('entry.form.email.placeholder')}
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                  <input
                    type="password"
                    name="matria-login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>

                <Button variant="hero" size="lg" className="w-full gap-2" disabled={loading} onClick={handleSignIn}>
                  {loading ? 'Signing in...' : t('auth.login')}
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <div className="flex justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('entry.no.account')}</span>
                  <button onClick={() => changeView('signup')} className="font-medium text-sage-600 hover:underline">
                    {t('auth.signup')}
                  </button>
                </div>
                <button onClick={() => changeView('options')} className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {t('common.back')}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <CrisisFooter />
    </div>
  );
}
