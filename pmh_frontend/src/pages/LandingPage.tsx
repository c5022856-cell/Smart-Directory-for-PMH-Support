import {
  Heart,
  Users,
  Shield,
  ArrowRight,
  Globe,
  MessageCircleHeart,
  LogIn,
  Menu,
  Languages,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { APPROVED_LANGUAGES } from '@/lib/languages';
import logoImage from '@/assets/logo.png.png';
import photo1Image from '@/assets/photo1.png';
import photo2Image from '@/assets/photo2.png';

const womenImages = {
  left: photo1Image,
  right: photo2Image,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, language, setLanguage, isRTL, isTranslating } = useLanguage();

  const goToGetStarted = () => {
    navigate('/entry');
  };

  const goToSignIn = () => {
    navigate('/entry?view=login');
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <section className="relative min-h-screen py-10 lg:py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8f4ef] via-[#eef5f1] to-[#f6f7fb]" />

        <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-[#cfe3d8] opacity-50 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#ead8d3] opacity-40 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#dce8f5] opacity-40 blur-3xl animate-pulse" />

        <div className="absolute inset-0 opacity-[0.08]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(106,143,124,0.35)_1px,transparent_1px)] bg-[length:28px_28px]" />
        </div>

        <div className="container relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-wrap items-center gap-4">
            <header className="flex flex-1 items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="Matria logo" className="h-11 w-11 object-contain" />
                <div>
                  <p className="text-lg font-semibold tracking-wide text-foreground">
                    MATR<span className="text-[#6A8F7C]">IA</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t('landing.brand.tagline')}</p>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <Button variant="ghost" className="rounded-full px-5" onClick={goToSignIn}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('auth.login')}
                </Button>
                <Button variant="hero" className="rounded-full px-6" onClick={goToGetStarted}>
                  {t('landing.hero.cta')}
                </Button>
              </div>

              <button
                type="button"
                className="rounded-full border border-white/70 bg-white/80 p-2 text-foreground shadow-sm md:hidden"
                aria-label={t('auth.login')}
                onClick={goToSignIn}
              >
                <Menu className="h-5 w-5" />
              </button>
            </header>

            <div className="block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full border border-white/70 bg-white/80 px-5 py-6 shadow-sm backdrop-blur">
                    <Languages className="mr-2 h-4 w-4" />
                    {APPROVED_LANGUAGES.find((lang) => lang.code === language)?.label ?? 'Language'}
                    {isTranslating && <Loader2 className="ml-2 h-4 w-4 animate-spin text-[#6A8F7C]" />}
                    <ChevronDown className={`h-4 w-4 ${isRTL ? 'mr-2 ml-0' : 'ml-2'}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44 rounded-2xl border-white/70 bg-white/95 backdrop-blur">
                  {APPROVED_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`cursor-pointer rounded-xl ${
                        language === lang.code ? 'bg-sage-50 text-sage-700 focus:bg-sage-50 focus:text-sage-700' : ''
                      }`}
                    >
                      <span className="mr-2 text-xs font-semibold text-[#6A8F7C]">{lang.flag}</span>
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e4dc] bg-white/70 px-4 py-2 text-sm text-[#466255] shadow-sm backdrop-blur">
                <Heart className="h-4 w-4" />
                {t('landing.badge')}
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
                  {t('landing.intro.title')}
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {t('landing.intro.body1')}
                </p>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {t('landing.intro.body2')}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md backdrop-blur">
                  <Users className="mb-3 h-5 w-5 text-[#6A8F7C]" />
                  <h3 className="mb-1 font-semibold text-foreground">{t('landing.card.inclusive.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('landing.card.inclusive.desc')}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md backdrop-blur">
                  <Shield className="mb-3 h-5 w-5 text-[#6A8F7C]" />
                  <h3 className="mb-1 font-semibold text-foreground">{t('landing.card.accessible.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('landing.card.accessible.desc')}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md backdrop-blur">
                  <Globe className="mb-3 h-5 w-5 text-[#6A8F7C]" />
                  <h3 className="mb-1 font-semibold text-foreground">{t('landing.card.cultural.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('landing.card.cultural.desc')}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row">
                <Button variant="hero" size="xl" className="gap-2 rounded-2xl px-8" onClick={goToGetStarted}>
                  {t('landing.hero.cta')}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="gap-2 rounded-2xl bg-white/75 px-8 backdrop-blur"
                  onClick={goToSignIn}
                >
                  <LogIn className="h-5 w-5" />
                  {t('auth.login')}
                </Button>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-5 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
                <MessageCircleHeart className="h-4 w-4 text-[#6A8F7C]" />
                {t('landing.support.modes')}
              </div>
            </div>

            <div className="relative min-h-[560px]">
              <div className="absolute left-0 top-0 w-[72%] overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl animate-[float_6s_ease-in-out_infinite]">
                <img
                  src={womenImages.left}
                  alt="Portrait of a smiling Black woman"
                  className="h-[430px] w-full object-cover"
                />
              </div>

              <div className="absolute bottom-0 right-0 w-[60%] overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-2xl animate-[float_7s_ease-in-out_infinite] [animation-delay:0.8s]">
                <img
                  src={womenImages.right}
                  alt="Portrait of a smiling white woman"
                  className="h-[330px] w-full object-cover"
                />
              </div>

              <div className="absolute left-[6%] top-[52%] max-w-sm rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl backdrop-blur">
                <p className="text-sm font-medium leading-relaxed text-foreground">"{t('landing.quote')}"</p>
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lg backdrop-blur">
              <h3 className="mb-3 text-2xl font-semibold text-foreground">{t('landing.why.title')}</h3>
              <p className="leading-relaxed text-muted-foreground">{t('landing.why.desc')}</p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lg backdrop-blur">
              <h3 className="mb-3 text-2xl font-semibold text-foreground">{t('landing.firstStep.title')}</h3>
              <p className="leading-relaxed text-muted-foreground">{t('landing.firstStep.desc')}</p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </section>
    </main>
  );
}
