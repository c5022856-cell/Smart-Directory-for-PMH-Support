import { Phone, MessageCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function CrisisFooter() {
  const { t } = useLanguage();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-4 px-4">
        <div className="container">
          <div className="flex items-center justify-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 bg-blush-50 text-blush-500 px-4 py-2 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('crisis.title')}</span>
            </div>
            <Button variant="warm" size="sm" className="gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{t('crisis.cta')}</span>
            </Button>
            <Button variant="warm" size="icon-sm">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
