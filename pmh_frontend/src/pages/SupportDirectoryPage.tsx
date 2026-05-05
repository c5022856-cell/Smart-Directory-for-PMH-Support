import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, MapPin, Phone, ExternalLink, Mail,
  Heart, Star, Clock, Sparkles, Languages, Video, Users, MessageCircle,
  ChevronDown, Info, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { addServiceToBooklet, getBookletItems, removeServiceFromBooklet } from '@/lib/booklet';
import { getLatestSupportAnalysis, getSupportInputStatus, recommendServices, translateContent } from '@/lib/ai';
import type { RecommendationContext, ServiceRecommendation, TranslationResult } from '@/types/ai';
import { toast } from 'sonner';

const supportTypes = [
  { id: 'clinical', label: 'Clinical', icon: Heart },
  { id: 'counseling', label: 'Counseling', icon: Heart },
  { id: 'peer', label: 'Peer Support', icon: Users },
  { id: 'group', label: 'Group Sessions', icon: Users },
  { id: 'resource', label: 'Resources', icon: ExternalLink },
  { id: 'crisis', label: 'Crisis Support', icon: Phone },
];

function getServiceIcon(type: string) {
  switch (type) {
    case 'peer':
    case 'group':
      return Users;
    case 'resource':
      return ExternalLink;
    case 'crisis':
      return Phone;
    default:
      return Heart;
  }
}

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

export default function SupportDirectoryPage() {
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();
  const latestAnalysis = getLatestSupportAnalysis();
  const supportInputStatus = getSupportInputStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [bookletIds, setBookletIds] = useState<string[]>([]);
  const [translateDescriptions, setTranslateDescriptions] = useState(false);
  const [translatedDescriptions, setTranslatedDescriptions] = useState<Record<string, string>>({});
  const [translatingDescriptions, setTranslatingDescriptions] = useState(false);
  const shouldHideSuggestions = supportInputStatus === 'skipped';

  useEffect(() => {
    setBookletIds(getBookletItems().map((item) => item.id));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
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

        const recommendationContext = shouldHideSuggestions
          ? null
          : buildRecommendationContext({ language, profile });
        const response = await recommendServices({
          profile: recommendationContext ?? undefined,
          limit: 50,
        });

        if (isMounted) {
          setServices(response.items);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load support recommendations';
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

  const filteredServices = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      if (selectedType && service.support_type !== selectedType) return false;
      if (!normalizedQuery) return true;

      return (
        service.name.toLowerCase().includes(normalizedQuery) ||
        (service.description || '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchQuery, selectedType, services]);

  const recommendedServices = shouldHideSuggestions ? [] : filteredServices.filter((service) => service.is_recommended);
  const otherServices = shouldHideSuggestions
    ? filteredServices
    : filteredServices.filter((service) => !service.is_recommended);

  useEffect(() => {
    const shouldTranslate = translateDescriptions && language !== 'en' && services.length > 0;
    if (!shouldTranslate) {
      setTranslatedDescriptions({});
      setTranslatingDescriptions(false);
      return;
    }

    const items = services
      .filter((service) => Boolean(service.description))
      .map((service) => ({
        key: service.id,
        text: service.description ?? '',
        source_language: 'en',
      }));

    if (items.length === 0) {
      setTranslatedDescriptions({});
      return;
    }

    let isMounted = true;
    setTranslatingDescriptions(true);

    void translateContent({
      items,
      target_language: language,
    })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const nextDescriptions = response.items.reduce<Record<string, string>>((accumulator, item: TranslationResult) => {
          accumulator[item.key] = item.translated_text;
          return accumulator;
        }, {});

        setTranslatedDescriptions(nextDescriptions);
      })
      .catch((translationError) => {
        if (!isMounted) {
          return;
        }

        const message = translationError instanceof Error ? translationError.message : 'Could not translate descriptions';
        toast.error(message);
        setTranslatedDescriptions({});
      })
      .finally(() => {
        if (isMounted) {
          setTranslatingDescriptions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [translateDescriptions, language, services]);

  const toggleBooklet = (service: ServiceRecommendation) => {
    if (bookletIds.includes(service.id)) {
      const updatedItems = removeServiceFromBooklet(service.id);
      setBookletIds(updatedItems.map((item) => item.id));
      toast.success('Removed from booklet');
      return;
    }

    const updatedItems = addServiceToBooklet(service);
    setBookletIds(updatedItems.map((item) => item.id));
    toast.success('Added to booklet');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 pb-32">
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-display-sm font-bold text-foreground mb-2">{t('directory.title')}</h1>
            <p className="text-body-lg text-muted-foreground">Browse the available services and resources, or use the resource finder to unlock matched results.</p>
          </motion.div>

          {(latestAnalysis?.risk_level === 'high' || latestAnalysis?.risk_level === 'urgent') && (
            <div className="card-elevated p-4 mb-6 flex items-start gap-3 border border-destructive/20 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Urgent support may be needed</p>
                <p className="text-sm text-muted-foreground">
                  The latest input suggests elevated risk. If you are in immediate danger, contact local emergency services now.
                </p>
              </div>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('directory.search')}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
              </div>
              <Button variant="outline" size="lg" onClick={() => setShowFilters((value) => !value)} className="gap-2">
                <Filter className="w-5 h-5" /> Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {supportTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedType === type.id
                        ? 'bg-sage-500 text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-sage-100 hover:text-sage-600'
                    }`}
                  >
                    <type.icon className="w-4 h-4" /> {type.label}
                  </button>
                ))}
                <button
                  onClick={() => setTranslateDescriptions((value) => !value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    translateDescriptions
                      ? 'bg-sage-500 text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-sage-100 hover:text-sage-600'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  {translateDescriptions ? 'Show original descriptions' : 'Translate descriptions'}
                </button>
              </div>
            )}
          </motion.div>

          {translateDescriptions && language !== 'en' && (
            <div className="mb-6 rounded-2xl bg-sage-50 p-4 text-sm text-sage-700">
              Only service descriptions are translated. Service names, contact details, and other metadata stay in the original language.
              {translatingDescriptions ? ' Translating descriptions now...' : ''}
            </div>
          )}

          {shouldHideSuggestions && (
            <div className="mb-6 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              Suggested matches stay hidden until the resource finder is completed. You can still browse the full directory below.
            </div>
          )}

          {loading && (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              Loading services and resources...
            </div>
          )}

          {!loading && error && (
            <div className="card-elevated p-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h2 className="font-semibold text-foreground">Directory unavailable</h2>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button variant="outline" className="w-fit gap-2" onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCcw className="w-4 h-4" /> Retry
              </Button>
            </div>
          )}

          {!loading && !error && recommendedServices.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-sage-500" />
                <h2 className="text-heading-md font-semibold text-foreground">{t('directory.recommended')}</h2>
              </div>
              <div className="space-y-4">
                {recommendedServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isExpanded={expandedService === service.id}
                    onToggle={() => setExpandedService(expandedService === service.id ? null : service.id)}
                    isSavedToBooklet={bookletIds.includes(service.id)}
                    onToggleBooklet={() => toggleBooklet(service)}
                    translatedDescription={translatedDescriptions[service.id]}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !error && otherServices.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-heading-md font-semibold text-foreground mb-4">All Services and Resources</h2>
              <div className="space-y-4">
                {otherServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isExpanded={expandedService === service.id}
                    onToggle={() => setExpandedService(expandedService === service.id ? null : service.id)}
                    isSavedToBooklet={bookletIds.includes(service.id)}
                    onToggleBooklet={() => toggleBooklet(service)}
                    translatedDescription={translatedDescriptions[service.id]}
                    t={t}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !error && filteredServices.length === 0 && (
            <div className="card-elevated p-8 text-center text-muted-foreground">
              No services match your current search or filters.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ServiceCard({
  service,
  isExpanded,
  onToggle,
  isSavedToBooklet,
  onToggleBooklet,
  translatedDescription,
  t,
}: {
  service: ServiceRecommendation;
  isExpanded: boolean;
  onToggle: () => void;
  isSavedToBooklet: boolean;
  onToggleBooklet: () => void;
  translatedDescription?: string;
  t: (key: string) => string;
}) {
  const ServiceIcon = getServiceIcon(service.support_type);
  const description = translatedDescription || service.description;

  return (
    <motion.div layout className={`card-elevated overflow-hidden ${service.is_recommended ? 'ring-2 ring-sage-200' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            service.support_type === 'counseling' || service.support_type === 'clinical'
              ? 'bg-blush-100 text-blush-500'
              : service.support_type === 'peer' || service.support_type === 'group'
                ? 'bg-sage-100 text-sage-500'
                : 'bg-warm-100 text-warm-500'
          }`}>
            <ServiceIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{service.name}</h3>
              {service.rating && (
                <div className="flex items-center gap-1 text-sm text-amber-500">
                  <Star className="w-4 h-4 fill-current" /> <span>{service.rating.toFixed(1)}</span>
                  {service.review_count ? <span className="text-muted-foreground">({service.review_count})</span> : null}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {service.delivery_modes.includes('online') && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-400 text-xs">
                  <Video className="w-3 h-3" /> Online
                </span>
              )}
              {service.delivery_modes.includes('in-person') && service.distance_label && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sage-100 text-sage-600 text-xs">
                  <MapPin className="w-3 h-3" /> {service.distance_label}
                </span>
              )}
              {service.delivery_modes.includes('phone') && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warm-100 text-warm-500 text-xs">
                  <Phone className="w-3 h-3" /> Phone
                </span>
              )}
              {service.delivery_modes.includes('message') && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blush-100 text-blush-500 text-xs">
                  <MessageCircle className="w-3 h-3" /> Message
                </span>
              )}
              {service.delivery_modes.includes('email') && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                  <Mail className="w-3 h-3" /> Email
                </span>
              )}
              {service.delivery_modes.includes('social') && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-400 text-xs">
                  <MessageCircle className="w-3 h-3" /> Social
                </span>
              )}
              {service.languages.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                  <Languages className="w-3 h-3" /> {service.languages.join(', ')}
                </span>
              )}
            </div>
            <button onClick={onToggle} className="flex items-center gap-2 text-sm text-sage-600 hover:underline">
              <Info className="w-4 h-4" />
              {isExpanded ? 'Hide details' : t('dashboard.contactDetails')}
            </button>
          </div>
        </div>

        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-border">
            {service.recommendation_reason && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-sage-50">
                <Sparkles className="w-5 h-5 text-sage-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-sage-700">{service.recommendation_reason}</p>
              </div>
            )}

            <div className="space-y-3 text-sm mb-4">
              {service.availability && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" /> <span>{service.availability}</span>
                </div>
              )}
              {service.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> <span>{service.phone}</span>
                </div>
              )}
              {service.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> <span>{service.email}</span>
                </div>
              )}
              {service.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> <span>{service.address}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant={isSavedToBooklet ? 'soft' : 'outline'} className="gap-2" onClick={onToggleBooklet}>
                <Sparkles className="w-4 h-4" /> {isSavedToBooklet ? 'Saved to Booklet' : 'Add to Booklet'}
              </Button>
              {service.website && (
                <Button variant="outline" className="gap-2" onClick={() => window.open(service.website || '', '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="w-4 h-4" /> Visit Website
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
