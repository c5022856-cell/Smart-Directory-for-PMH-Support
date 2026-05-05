import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Baby, Users, ArrowRight, ArrowLeft, Check, Phone, MapPin, Globe, Brain, Stethoscope, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

const stages = [
  { id: 'pregnant', icon: Baby, labelKey: 'onboarding.pregnant' },
  { id: 'postpartum', icon: Heart, labelKey: 'onboarding.postpartum' },
  { id: 'supporter', icon: Users, labelKey: 'onboarding.supporter' },
];

const supportTypes = [
  { id: 'emotional', icon: HandHeart, labelKey: 'onboarding.support.emotional' },
  { id: 'practical', icon: Brain, labelKey: 'onboarding.support.practical' },
  { id: 'clinical', icon: Stethoscope, labelKey: 'onboarding.support.clinical' },
];

const interactionTypes = [
  { id: 'call', icon: Phone, labelKey: 'onboarding.interaction.call' },
  { id: 'inperson', icon: MapPin, labelKey: 'onboarding.interaction.inperson' },
  { id: 'online', icon: Globe, labelKey: 'onboarding.interaction.online' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, isAnonymous } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<string[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const savePreferences = async () => {
    if (user && !isAnonymous) {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          motherhood_stage: selectedStage,
          support_types: selectedSupport,
          interaction_preferences: selectedInteraction,
        })
        .eq('user_id', user.id);
      setSaving(false);
      if (error) {
        toast.error('Could not save preferences');
        console.error(error);
      }
    }
    navigate('/dashboard');
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      savePreferences();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const toggleMulti = (id: string, selected: string[], setter: (v: string[]) => void) => {
    setter(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepContent icon={<Baby className="w-8 h-8 text-blush-500" />} iconBg="bg-blush-100" title={t('onboarding.situation')} subtitle={t('onboarding.step1.desc')}>
            <div className="grid gap-3 max-w-sm mx-auto">
              {stages.map((item) => (
                <SelectButton key={item.id} icon={<item.icon className={`w-5 h-5 ${selectedStage === item.id ? 'text-sage-600' : 'text-muted-foreground'}`} />} label={t(item.labelKey)} selected={selectedStage === item.id} onClick={() => setSelectedStage(item.id)} />
              ))}
            </div>
          </StepContent>
        );
      case 1:
        return (
          <StepContent icon={<HandHeart className="w-8 h-8 text-sage-500" />} iconBg="bg-sage-100" title={t('onboarding.support.title')} subtitle={t('onboarding.support.desc')}>
            <div className="grid gap-3 max-w-sm mx-auto">
              {supportTypes.map((item) => (
                <SelectButton key={item.id} icon={<item.icon className={`w-5 h-5 ${selectedSupport.includes(item.id) ? 'text-sage-600' : 'text-muted-foreground'}`} />} label={t(item.labelKey)} selected={selectedSupport.includes(item.id)} onClick={() => toggleMulti(item.id, selectedSupport, setSelectedSupport)} multi />
              ))}
              <p className="text-xs text-center text-muted-foreground mt-1">{t('onboarding.multi.hint')}</p>
            </div>
          </StepContent>
        );
      case 2:
        return (
          <StepContent icon={<Phone className="w-8 h-8 text-sky-400" />} iconBg="bg-sky-100" title={t('onboarding.interaction.title')} subtitle={t('onboarding.interaction.desc')}>
            <div className="grid gap-3 max-w-sm mx-auto">
              {interactionTypes.map((item) => (
                <SelectButton key={item.id} icon={<item.icon className={`w-5 h-5 ${selectedInteraction.includes(item.id) ? 'text-sage-600' : 'text-muted-foreground'}`} />} label={t(item.labelKey)} selected={selectedInteraction.includes(item.id)} onClick={() => toggleMulti(item.id, selectedInteraction, setSelectedInteraction)} multi />
              ))}
              <p className="text-xs text-center text-muted-foreground mt-1">{t('onboarding.multi.hint')}</p>
            </div>
          </StepContent>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div className="h-full bg-sage-500" animate={{ width: `${((step + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="fixed top-4 right-4 z-50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>{t('onboarding.skip')}</Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="p-6 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <Button variant="ghost" size="lg" onClick={prevStep} disabled={step === 0} className="gap-2">
            <ArrowLeft className="w-5 h-5" /> {t('common.back')}
          </Button>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-sage-500' : i < step ? 'bg-sage-300' : 'bg-muted'}`} />
            ))}
          </div>
          <Button variant="hero" size="lg" onClick={nextStep} disabled={saving} className="gap-2">
            {step === totalSteps - 1 ? (saving ? 'Saving...' : t('landing.hero.cta')) : t('onboarding.next')}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepContent({ icon, iconBg, title, subtitle, children }: { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-6`}>{icon}</div>
      <h2 className="text-heading-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-body-md text-muted-foreground mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function SelectButton({ icon, label, selected, onClick, multi }: { icon: React.ReactNode; label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selected ? 'border-sage-400 bg-sage-50' : 'border-border hover:border-sage-200 bg-card'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-sage-200' : 'bg-muted'}`}>{icon}</div>
      <span className="font-medium text-foreground flex-1 text-left">{label}</span>
      {selected && <div className="w-6 h-6 rounded-full bg-sage-500 flex items-center justify-center"><Check className="w-4 h-4 text-primary-foreground" /></div>}
    </button>
  );
}
