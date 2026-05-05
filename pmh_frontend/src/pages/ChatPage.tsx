import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Bot, ExternalLink, Send, Shield, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getLatestSupportAnalysis, sendChatMessage } from '@/lib/ai';
import type { ChatMessage, ChatResponse, RecommendationContext, RiskLevel } from '@/types/ai';

type StoredProfile = {
  motherhood_stage: string | null;
  support_types: string[] | null;
  interaction_preferences: string[] | null;
  preferred_language: string | null;
} | null;

type ChatMessageView = ChatMessage & {
  id: string;
  meta?: {
    disclaimer: string | null;
    risk_level: RiskLevel;
    used_fallback: boolean;
    sources: string[];
  };
};

function buildGreeting(t: (key: string) => string): string {
  return t('chat.greeting');
}

function buildRecommendationContext(language: string, profile: StoredProfile): RecommendationContext {
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

function toRequestMessages(messages: ChatMessageView[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

function MarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span dir="auto" className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div dir="auto" className="markdown-chat prose prose-sm max-w-none prose-p:my-0 prose-p:leading-6 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-current prose-em:text-current prose-code:rounded prose-code:bg-black/5 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-black/80 prose-pre:text-white prose-a:text-sage-600 prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatPage() {
  const { language, t } = useLanguage();
  const { user, isGuest } = useAuth();
  const endRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<StoredProfile>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: buildGreeting(t),
      meta: {
        disclaimer: t('chat.disclaimer'),
        risk_level: 'low',
        used_fallback: true,
        sources: [],
      },
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisLocked, setCrisisLocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user || isGuest) {
        if (isMounted) {
          setProfile(null);
        }
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('motherhood_stage, support_types, interaction_preferences, preferred_language')
        .eq('user_id', user.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.role !== 'assistant') {
        return current;
      }

      return [
        {
          ...current[0],
          content: buildGreeting(t),
          meta: current[0].meta
            ? {
                ...current[0].meta,
                disclaimer: t('chat.disclaimer'),
              }
            : current[0].meta,
        },
      ];
    });
  }, [language, t]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || crisisLocked) {
      return;
    }

    const nextMessages: ChatMessageView[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      },
    ];

    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const response: ChatResponse = await sendChatMessage({
        messages: toRequestMessages(nextMessages),
        profile: buildRecommendationContext(language, profile),
      });

      if (response.risk_level === 'high' || response.risk_level === 'urgent') {
        setCrisisLocked(true);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: response.message.role,
          content: response.message.content,
          meta: {
            disclaimer: response.disclaimer,
            risk_level: response.risk_level,
            used_fallback: response.used_fallback,
            sources: response.sources,
          },
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('chat.error'));
    } finally {
      setSending(false);
    }
  };

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant' && message.meta);
  const elevatedRisk = latestAssistantMessage?.meta?.risk_level === 'high' || latestAssistantMessage?.meta?.risk_level === 'urgent';

  return (
    <Layout showCrisisFooter={false}>
      <div className="min-h-screen bg-background pb-8">
        <div className="container max-w-4xl py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-display-sm font-bold text-foreground mb-2">{t('chat.title')}</h1>
                <p className="text-body-lg text-muted-foreground">
                  {t('chat.subtitle')}
                </p>
              </div>
              <Link to="/support">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {t('chat.openDirectory')}
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="card-elevated p-4 sm:p-6 min-h-[70vh] flex flex-col">
              <div className="mb-4 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Shield className="w-4 h-4" />
                  <span>{t('chat.safety.title')}</span>
                </div>
                <p>{t('chat.safety.body')}</p>
              </div>

              {elevatedRisk && (
                <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{t('chat.urgent.title')}</p>
                      <p className="text-muted-foreground">{t('chat.urgent.body')}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link to="/support">
                          <Button variant="warm" size="sm">{t('chat.openDirectory')}</Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCrisisLocked(false);
                            setMessages([
                              {
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: buildGreeting(t),
                                meta: {
                                  disclaimer: t('chat.disclaimer'),
                                  risk_level: 'low',
                                  used_fallback: true,
                                  sources: [],
                                },
                              },
                            ]);
                            setDraft('');
                            setError(null);
                          }}
                        >
                          {t('chat.new')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                      <div
                        dir="auto"
                        className={`rounded-3xl px-4 py-3 text-sm leading-6 ${
                          message.role === 'user'
                            ? 'bg-sage-500 text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <MarkdownMessage content={message.content} isUser={message.role === 'user'} />
                      </div>
                      {message.meta?.disclaimer && (
                        <p dir="auto" className="mt-2 px-1 text-xs text-muted-foreground">
                          {message.meta.disclaimer}
                        </p>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-2xl bg-blush-100 text-blush-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-3xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                      {t('chat.thinking')}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div ref={endRef} />
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={t('chat.placeholder')}
                    className="min-h-[110px] border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
                    maxLength={2000}
                    disabled={crisisLocked}
                    dir="auto"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {crisisLocked
                        ? t('chat.paused')
                        : t('chat.helper')}
                    </p>
                    <Button variant="hero" className="gap-2" disabled={!draft.trim() || sending || crisisLocked} onClick={() => void handleSend()}>
                      <Send className="w-4 h-4" />
                      {t('chat.send')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-sage-500" />
                  <h2 className="font-semibold text-foreground">{t('chat.capabilities.title')}</h2>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t('chat.capabilities.one')}</li>
                  <li>{t('chat.capabilities.two')}</li>
                  <li>{t('chat.capabilities.three')}</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
