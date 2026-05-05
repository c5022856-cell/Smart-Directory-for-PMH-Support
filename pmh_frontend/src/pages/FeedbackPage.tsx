import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Heart, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

const feedbackTypes = [
  { id: 'experience', label: 'Share your experience' },
  { id: 'suggestion', label: 'Suggest improvement' },
  { id: 'concern', label: 'Report a concern' },
];

export default function FeedbackPage() {
  const { t } = useLanguage();
  const [type, setType] = useState('experience');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-sage-500" />
            </div>
            <h2 className="text-heading-lg font-bold text-foreground mb-2">{t('feedback.thanks.title')}</h2>
            <p className="text-body-md text-muted-foreground mb-6">{t('feedback.thanks.desc')}</p>
            <Button variant="hero" onClick={() => { setSubmitted(false); setMessage(''); }}>
              {t('feedback.another')}
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 pb-32">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-display-sm font-bold text-foreground mb-2">{t('nav.feedback')}</h1>
            <p className="text-body-lg text-muted-foreground">{t('feedback.subtitle')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">{t('feedback.type')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {feedbackTypes.map((ft) => (
                    <button
                      key={ft.id}
                      onClick={() => setType(ft.id)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        type === ft.id ? 'bg-sage-500 text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-sage-100'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('feedback.message')}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={t('feedback.placeholder')}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isAnonymous ? 'bg-sage-100 text-sage-600' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {t('feedback.anonymous')}
                </button>
              </div>

              <Button variant="hero" size="lg" className="w-full gap-2" onClick={handleSubmit} disabled={!message.trim()}>
                <Send className="w-5 h-5" />
                {t('feedback.submit')}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
