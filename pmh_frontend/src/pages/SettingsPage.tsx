import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Check,
  Edit2,
  BookOpen,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getBookletItems, removeServiceFromBooklet, type BookletItem } from '@/lib/booklet';
import { APPROVED_LANGUAGES } from '@/lib/languages';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, isGuest } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [bookletItems, setBookletItems] = useState<BookletItem[]>([]);

  useEffect(() => {
    if (user && !isGuest) {
      supabase
        .from('profiles')
        .select('full_name, nickname')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setNickname(data.nickname || data.full_name || '');
          }
        });
    }
  }, [user, isGuest]);

  useEffect(() => {
    setBookletItems(getBookletItems());
  }, []);

  const saveName = async () => {
    if (user) {
      await supabase.from('profiles').update({ nickname }).eq('user_id', user.id);
      toast.success('Nickname updated');
    }
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRemoveBookletItem = (serviceId: string) => {
    const updatedItems = removeServiceFromBooklet(serviceId);
    setBookletItems(updatedItems);
    toast.success('Removed from booklet');
  };

  const menuItems = [
    { id: 'privacy', icon: Shield, label: t('settings.privacy'), desc: t('settings.privacy.desc') },
    { id: 'notifications', icon: Bell, label: t('settings.notifications'), desc: t('settings.notifications.desc') },
    { id: 'language', icon: Globe, label: t('settings.language'), desc: t('settings.language.desc') },
    { id: 'booklet', icon: BookOpen, label: 'My Booklet', desc: 'Saved services you want to revisit later' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 pb-32">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="mb-2 text-display-sm font-bold text-foreground">{t('nav.settings')}</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated mb-6 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-400 to-sage-500 shadow-sm">
                <span className="text-xl font-semibold text-primary-foreground">M</span>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="border-b-2 border-sage-400 bg-transparent text-lg font-semibold text-foreground focus:outline-none"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon-sm" onClick={saveName}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{nickname || (isGuest ? 'Guest' : 'User')}</h2>
                    {!isGuest && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{isGuest ? 'Guest session' : user?.email}</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated mb-6 overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}
                className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted ${
                  index !== menuItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${activeSection === item.id ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </motion.div>

          {activeSection === 'language' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card-elevated mb-6 p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {APPROVED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 transition-colors ${
                      language === lang.code ? 'bg-sage-100 text-sage-600' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="w-8 text-center text-xs font-semibold tracking-wide">{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                    {language === lang.code && <Check className="ml-auto h-5 w-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'booklet' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card-elevated mb-6 p-4">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sage-500" />
                <h2 className="font-semibold text-foreground">My Booklet</h2>
              </div>

              {bookletItems.length === 0 ? (
                <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  No saved services yet. Use "Add to Booklet" in the support directory to save useful services here.
                </div>
              ) : (
                <div className="space-y-4">
                  {bookletItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.support_type}</p>
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveBookletItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {item.description && <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>}

                      <div className="mb-3 flex flex-wrap gap-2">
                        {item.languages.length > 0 && (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            Languages: {item.languages.join(', ')}
                          </span>
                        )}
                        {item.delivery_modes.length > 0 && (
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-500">
                            {item.delivery_modes.join(', ')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        {item.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{item.email}</span>
                          </div>
                        )}
                        {item.website && (
                          <button
                            onClick={() => window.open(item.website || '', '_blank', 'noopener,noreferrer')}
                            className="flex items-center gap-2 text-sage-600 hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Visit website</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            {t('settings.signout')}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
