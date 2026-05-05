import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Hash,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  Share2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  analyzeSupportInput,
  clearLatestSupportAnalysis,
  setSupportInputStatus,
  storeLatestSupportAnalysis,
} from '@/lib/ai';
import { CrisisFooter } from '@/components/layout/CrisisFooter';
import { toast } from 'sonner';
import type { SupportAnalysis } from '@/types/ai';

type InputMode = null | 'text' | 'guided';
type ServiceLocation = 'sheffield' | 'uk';
type SheffieldAccess = 'phone_email' | 'online' | 'social';
type UkAccess = 'email' | 'phone' | 'online';
type SocialChannel = 'apps' | 'facebook' | 'x';

const GUIDED_BASE_STEP_COUNT = 2;

export default function SupportInputPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();

  const [mode, setMode] = useState<InputMode>(null);
  const [textInput, setTextInput] = useState('');
  const [guidedStep, setGuidedStep] = useState(0);
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation | null>(null);
  const [guidedAccess, setGuidedAccess] = useState<SheffieldAccess | UkAccess | null>(null);
  const [socialChannel, setSocialChannel] = useState<SocialChannel | null>(null);
  const [saving, setSaving] = useState(false);
  const [crisisAnalysis, setCrisisAnalysis] = useState<SupportAnalysis | null>(null);

  const needsSocialChannel = serviceLocation === 'sheffield' && guidedAccess === 'social';
  const guidedStepCount = needsSocialChannel ? 3 : GUIDED_BASE_STEP_COUNT;

  const guidedOptions = useMemo(() => {
    if (serviceLocation === 'sheffield') {
      return [
        { id: 'phone_email' as const, icon: Phone, label: t('input.workflow.sheffield.phone_email') },
        { id: 'online' as const, icon: Globe, label: t('input.workflow.sheffield.online') },
        { id: 'social' as const, icon: Share2, label: t('input.workflow.sheffield.social') },
      ];
    }

    return [
      { id: 'email' as const, icon: Mail, label: t('input.workflow.uk.email') },
      { id: 'phone' as const, icon: Phone, label: t('input.workflow.uk.phone') },
      { id: 'online' as const, icon: Globe, label: t('input.workflow.uk.online') },
    ];
  }, [serviceLocation, t]);

  const socialOptions = useMemo(
    () => [
      { id: 'apps' as const, icon: Smartphone, label: t('input.workflow.social.apps') },
      { id: 'facebook' as const, icon: MessageCircle, label: t('input.workflow.social.facebook') },
      { id: 'x' as const, icon: Hash, label: t('input.workflow.social.x') },
    ],
    [t],
  );

  const resetGuidedState = () => {
    setGuidedStep(0);
    setServiceLocation(null);
    setGuidedAccess(null);
    setSocialChannel(null);
  };

  const updateSignedInProfile = async (analysis: SupportAnalysis) => {
    if (!user || isGuest) {
      return;
    }

    await supabase
      .from('profiles')
      .update({
        motherhood_stage: null,
        support_types: analysis.support_types,
        interaction_preferences: analysis.interaction_preferences,
        preferred_language: language,
      })
      .eq('user_id', user.id);
  };

  const buildGuidedAnalysis = (): SupportAnalysis | null => {
    if (!serviceLocation || !guidedAccess) {
      return null;
    }

    if (serviceLocation === 'sheffield' && guidedAccess === 'social' && !socialChannel) {
      return null;
    }

    const keywords = serviceLocation === 'sheffield' ? ['sheffield'] : ['uk', 'nationwide'];
    const interactionPreferences: string[] = [];
    let workflowBranch = '';

    if (serviceLocation === 'sheffield') {
      if (guidedAccess === 'phone_email') {
        interactionPreferences.push('phone', 'email');
        workflowBranch = 'workflow:sheffield:phone-email';
        keywords.push('phone', 'email', workflowBranch);
      } else if (guidedAccess === 'online') {
        interactionPreferences.push('online');
        workflowBranch = 'workflow:sheffield:online';
        keywords.push('online', workflowBranch);
      } else if (guidedAccess === 'social') {
        interactionPreferences.push('social');
        workflowBranch = `workflow:sheffield:social:${socialChannel}`;
        keywords.push('social', 'social media', socialChannel ?? '', workflowBranch);
      }
    } else {
      interactionPreferences.push(guidedAccess);
      workflowBranch = `workflow:uk:${guidedAccess}`;
      keywords.push(guidedAccess, workflowBranch);
    }

    const summary =
      serviceLocation === 'sheffield'
        ? `Guided directory selection: Sheffield services via ${
            guidedAccess === 'social' ? `social media (${socialChannel})` : guidedAccess.replace('_', ' ')
          }`
        : `Guided directory selection: UK-wide services via ${guidedAccess}`;

    return {
      detected_language: language,
      motherhood_stage: null,
      support_types: [],
      interaction_preferences: interactionPreferences,
      risk_level: 'low',
      keywords: keywords.filter(Boolean),
      summary,
      requires_crisis_action: false,
      crisis_guidance: null,
      saved: false,
      storage_error: null,
    };
  };

  const handleSkip = () => {
    clearLatestSupportAnalysis();
    setSupportInputStatus('skipped');
    navigate('/dashboard');
  };

  const handleGuidedContinue = async () => {
    const analysis = buildGuidedAnalysis();
    if (!analysis) {
      return;
    }

    setSaving(true);
    try {
      storeLatestSupportAnalysis(analysis);
      setSupportInputStatus('completed');
      await updateSignedInProfile(analysis);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the guided directory selection';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTextContinue = async () => {
    if (!textInput.trim()) {
      return;
    }

    setSaving(true);
    try {
      const analysis = await analyzeSupportInput({
        text: textInput,
        user_id: user?.id ?? null,
        profile: {
          preferred_language: language,
        },
        persist: true,
      });

      storeLatestSupportAnalysis(analysis);
      setSupportInputStatus('completed');
      await updateSignedInProfile(analysis);

      if (analysis.requires_crisis_action) {
        setCrisisAnalysis(analysis);
        toast.error('Urgent support indicators detected. Review the crisis guidance before browsing the directory.');
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not analyze the directory request';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const canAdvance =
    guidedStep === 0
      ? Boolean(serviceLocation)
      : guidedStep === 1
        ? Boolean(serviceLocation && guidedAccess)
        : Boolean(needsSocialChannel && socialChannel);

  const isFinalGuidedStep = guidedStep === guidedStepCount - 1;

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 pb-24">
        <div className="w-full max-w-lg">
          {mode === null && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-sage-500" />
              </div>
              <h1 className="text-heading-lg font-bold text-foreground mb-2">{t('input.title')}</h1>
              <p className="text-body-md text-muted-foreground mb-8">{t('input.subtitle')}</p>

              <div className="space-y-4">
                <button
                  onClick={() => setMode('text')}
                  className="w-full card-elevated p-5 hover:shadow-lg transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blush-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blush-200 transition-colors">
                      <PenLine className="w-6 h-6 text-blush-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{t('input.text.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('input.text.desc')}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    resetGuidedState();
                    setMode('guided');
                  }}
                  className="w-full card-elevated p-5 hover:shadow-lg transition-all cursor-pointer group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sage-200 transition-colors">
                      <ListChecks className="w-6 h-6 text-sage-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{t('input.guided.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('input.guided.desc')}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
                  </div>
                </button>
              </div>

              <button onClick={handleSkip} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('onboarding.skip')}
              </button>
            </motion.div>
          )}

          {mode === 'text' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6">
              <h2 className="text-heading-md font-semibold text-foreground mb-2">{t('input.text.title')}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t('input.text.help')}</p>
              {crisisAnalysis && (
                <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <h3 className="font-semibold text-foreground mb-2">{t('input.crisis.title')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {crisisAnalysis.crisis_guidance || 'If there is immediate danger, contact local emergency services now.'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => navigate('/support')}>
                      {t('input.crisis.directory')}
                    </Button>
                    <Button variant="ghost" onClick={() => setCrisisAnalysis(null)}>
                      Edit message
                    </Button>
                  </div>
                </div>
              )}
              <Textarea
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder={t('input.text.placeholder')}
                className="min-h-[160px] mb-4 rounded-xl"
                maxLength={1000}
                disabled={saving || Boolean(crisisAnalysis)}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Sparkles className="w-3 h-3" />
                <span>{t('input.ai.label')}</span>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setMode(null)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-2"
                  disabled={!textInput.trim() || saving || Boolean(crisisAnalysis)}
                  onClick={handleTextContinue}
                >
                  {saving ? 'Matching resources...' : t('input.continue')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'guided' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="h-1 bg-muted rounded-full mb-8">
                <motion.div
                  className="h-full bg-sage-500 rounded-full"
                  animate={{ width: `${((guidedStep + 1) / guidedStepCount) * 100}%` }}
                />
              </div>

              <AnimatePresence mode="wait">
                {guidedStep === 0 && (
                  <GuidedStepContent
                    key="step0"
                    title={t('input.workflow.location.title')}
                    subtitle={t('input.workflow.location.desc')}
                  >
                    <div className="grid gap-3">
                      <SelectButton
                        icon={<MapPin className={`w-5 h-5 ${serviceLocation === 'sheffield' ? 'text-sage-600' : 'text-muted-foreground'}`} />}
                        label={t('input.workflow.location.sheffield')}
                        selected={serviceLocation === 'sheffield'}
                        onClick={() => {
                          setServiceLocation('sheffield');
                          setGuidedAccess(null);
                          setSocialChannel(null);
                        }}
                      />
                      <SelectButton
                        icon={<Globe className={`w-5 h-5 ${serviceLocation === 'uk' ? 'text-sage-600' : 'text-muted-foreground'}`} />}
                        label={t('input.workflow.location.uk')}
                        selected={serviceLocation === 'uk'}
                        onClick={() => {
                          setServiceLocation('uk');
                          setGuidedAccess(null);
                          setSocialChannel(null);
                        }}
                      />
                    </div>
                  </GuidedStepContent>
                )}

                {guidedStep === 1 && serviceLocation && (
                  <GuidedStepContent
                    key="step1"
                    title={
                      serviceLocation === 'sheffield'
                        ? t('input.workflow.sheffield.title')
                        : t('input.workflow.uk.title')
                    }
                    subtitle={
                      serviceLocation === 'sheffield'
                        ? t('input.workflow.sheffield.desc')
                        : t('input.workflow.uk.desc')
                    }
                  >
                    <div className="grid gap-3">
                      {guidedOptions.map((option) => (
                        <SelectButton
                          key={option.id}
                          icon={
                            <option.icon
                              className={`w-5 h-5 ${guidedAccess === option.id ? 'text-sage-600' : 'text-muted-foreground'}`}
                            />
                          }
                          label={option.label}
                          selected={guidedAccess === option.id}
                          onClick={() => {
                            setGuidedAccess(option.id);
                            setSocialChannel(null);
                            if (serviceLocation === 'sheffield' && option.id === 'social') {
                              setGuidedStep(2);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </GuidedStepContent>
                )}

                {guidedStep === 2 && needsSocialChannel && (
                  <GuidedStepContent
                    key="step2"
                    title={t('input.workflow.social.title')}
                    subtitle={t('input.workflow.social.desc')}
                  >
                    <div className="grid gap-3">
                      {socialOptions.map((option) => (
                        <SelectButton
                          key={option.id}
                          icon={
                            <option.icon
                              className={`w-5 h-5 ${socialChannel === option.id ? 'text-sage-600' : 'text-muted-foreground'}`}
                            />
                          }
                          label={option.label}
                          selected={socialChannel === option.id}
                          onClick={() => setSocialChannel(option.id)}
                        />
                      ))}
                    </div>
                  </GuidedStepContent>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between gap-4 mt-8">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    if (guidedStep === 0) {
                      setMode(null);
                      resetGuidedState();
                      return;
                    }

                    setGuidedStep(guidedStep - 1);
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="w-5 h-5" /> {t('common.back')}
                </Button>
                <div className="flex gap-2">
                  {Array.from({ length: guidedStepCount }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === guidedStep ? 'bg-sage-500' : index < guidedStep ? 'bg-sage-300' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => {
                    if (!isFinalGuidedStep) {
                      setGuidedStep(guidedStep + 1);
                      return;
                    }

                    void handleGuidedContinue();
                  }}
                  disabled={!canAdvance || saving}
                  className="gap-2"
                >
                  {isFinalGuidedStep ? (saving ? 'Saving...' : t('input.continue')) : t('onboarding.next')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <CrisisFooter />
    </div>
  );
}

function GuidedStepContent({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <h2 className="text-heading-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-body-md text-muted-foreground mb-8">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function SelectButton({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
        selected ? 'border-sage-400 bg-sage-50' : 'border-border hover:border-sage-200 bg-card'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-sage-200' : 'bg-muted'}`}>
        {icon}
      </div>
      <span className="font-medium text-foreground flex-1 text-left">{label}</span>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-sage-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}
