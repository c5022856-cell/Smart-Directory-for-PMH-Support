import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles, Users, Languages, Video, Phone, Globe, Mail, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLatestSupportAnalysis, getSupportInputStatus, listCommunityPosts, recommendServices } from '@/lib/ai';
import type { CommunityPost, RecommendationContext, ServiceRecommendation } from '@/types/ai';

function buildRecommendationContext(params: {
  language: string;
  profile: {
    motherhood_stage: string | null;
    support_types: string[] | null;
    interaction_preferences: string[] | null;
    preferred_language: string | null;
  } | null;
}): RecommendationContext {
  const { language, profile } = params;
  const latestAnalysis = getLatestSupportAnalysis();

  return {
    motherhood_stage: latestAnalysis?.motherhood_stage ?? profile?.motherhood_stage ?? null,
    support_types: latestAnalysis?.support_types.length ? latestAnalysis.support_types : profile?.support_types ?? [],
    interaction_preferences: latestAnalysis?.interaction_preferences.length
      ? latestAnalysis.interaction_preferences
      : profile?.interaction_preferences ?? [],
    preferred_language: latestAnalysis?.detected_language ?? profile?.preferred_language ?? language,
    risk_level: latestAnalysis?.risk_level ?? 'low',
    keywords: latestAnalysis?.keywords ?? [],
  };
}

function getPrimaryMode(service: ServiceRecommendation) {
  if (service.delivery_modes.includes('online')) return 'online';
  if (service.delivery_modes.includes('email')) return 'email';
  if (service.delivery_modes.includes('social')) return 'social';
  if (service.delivery_modes.includes('message')) return 'message';
  if (service.delivery_modes.includes('phone')) return 'phone';
  return service.delivery_modes[0] || 'support';
}

function formatPostTime(value: string): string {
  const normalizedValue = /z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const createdAt = new Date(normalizedValue).getTime();
  if (Number.isNaN(createdAt)) {
    return '';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(normalizedValue).toLocaleDateString();
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();
  const [services, setServices] = useState<ServiceRecommendation[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const supportInputStatus = getSupportInputStatus();
  const shouldHideSuggestions = supportInputStatus === 'skipped';

  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      if (shouldHideSuggestions) {
        setServices([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let profile: {
          motherhood_stage: string | null;
          support_types: string[] | null;
          interaction_preferences: string[] | null;
          preferred_language: string | null;
        } | null = null;

        if (user && !isGuest) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('motherhood_stage, support_types, interaction_preferences, preferred_language')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            throw profileError;
          }

          profile = data;
        }

        const recommendationContext = buildRecommendationContext({ language, profile });
        const serviceResponse = await recommendServices({ profile: recommendationContext, limit: 2 });

        if (isMounted) {
          setServices(serviceResponse.items);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load AI recommendations';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest, language, reloadKey, shouldHideSuggestions]);

  useEffect(() => {
    let isMounted = true;

    const loadCommunityPosts = async () => {
      setCommunityLoading(true);
      setCommunityError(null);

      try {
        const response = await listCommunityPosts();
        if (isMounted) {
          setCommunityPosts(response.items.slice(0, 2));
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load community posts';
          setCommunityError(message);
        }
      } finally {
        if (isMounted) {
          setCommunityLoading(false);
        }
      }
    };

    void loadCommunityPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 pb-32">
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-display-sm font-bold text-foreground mb-2">{t('dashboard.welcome')}</h1>
            <p className="text-body-lg text-muted-foreground">{t('dashboard.welcome.desc')}</p>
          </motion.div>

          {error && (
            <div className="card-elevated p-4 mb-8 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">AI recommendations unavailable</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                Retry
              </Button>
            </div>
          )}

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sage-500" />
                <h2 className="text-heading-md font-semibold text-foreground">{t('dashboard.services')}</h2>
              </div>
              <Link to="/support" className="text-sm text-sage-500 hover:underline flex items-center gap-1">
                {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {loading && (
                <div className="card-elevated p-4 text-sm text-muted-foreground sm:col-span-2">
                  Loading service recommendations...
                </div>
              )}
              {!loading && shouldHideSuggestions && (
                <div className="card-elevated p-5 text-sm text-muted-foreground sm:col-span-2">
                  Use the resource finder first if you want matched suggestions. You can still open the full directory at any time.
                </div>
              )}
              {!loading && services.map((service) => (
                <ServiceCard key={service.id} service={service} t={t} />
              ))}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sage-500" />
                <h2 className="text-heading-md font-semibold text-foreground">{t('dashboard.community')}</h2>
              </div>
              <Link to="/community" className="text-sm text-sage-500 hover:underline flex items-center gap-1">
                {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {communityLoading && (
                <div className="card-elevated p-4 text-sm text-muted-foreground">
                  Loading community highlights...
                </div>
              )}
              {!communityLoading && communityError && (
                <div className="card-elevated p-4 text-sm text-muted-foreground">
                  Community highlights are unavailable right now.
                </div>
              )}
              {!communityLoading && !communityError && communityPosts.length === 0 && (
                <div className="card-elevated p-4 text-sm text-muted-foreground">
                  No community posts yet.
                </div>
              )}
              {!communityLoading && !communityError && communityPosts.map((post) => (
                <div key={post.id} className="card-elevated p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-sage-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground mb-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count}</span>
                        <span>{formatPostTime(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
}

function ServiceCard({ service, t }: { service: ServiceRecommendation; t: (k: string) => string }) {
  const [showContact, setShowContact] = useState(false);
  const mode = getPrimaryMode(service);

  return (
    <div className="card-elevated p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-sage-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{service.name}</h3>
          <p className="text-xs text-muted-foreground capitalize">{service.support_type}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warm-100 text-warm-500 text-xs">
          <Languages className="w-3 h-3" />
          {service.languages.join(', ')}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-400 text-xs">
          {mode === 'online' ? <Video className="w-3 h-3" /> : mode === 'email' ? <Mail className="w-3 h-3" /> : mode === 'message' || mode === 'social' ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
          {mode}
        </span>
      </div>
      {service.recommendation_reason && (
        <div className="flex items-center gap-1 text-xs text-sage-600 mb-3">
          <Sparkles className="w-3 h-3" />
          <span>{service.recommendation_reason}</span>
        </div>
      )}
      <Button variant="hero" size="sm" className="w-full gap-2" onClick={() => setShowContact(!showContact)}>
        <Phone className="w-4 h-4" />
        {t('dashboard.contactDetails')}
      </Button>
      {showContact && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
          {service.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" /> <span>{service.phone}</span>
            </div>
          )}
          {service.website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-4 h-4" /> <a href={service.website} target="_blank" rel="noopener noreferrer" className="text-sage-500 hover:underline">Website</a>
            </div>
          )}
          {service.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" /> <span>{service.email}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
