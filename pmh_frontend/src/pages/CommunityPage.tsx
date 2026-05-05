import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Heart, Loader2,
  MessageCircle, RefreshCcw, Send, Sparkles, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createCommunityPost, listCommunityPosts, updateCommunityPostLike } from '@/lib/ai';
import type { CommunityPost } from '@/types/ai';
import { toast } from 'sonner';

const LIKED_POSTS_KEY = 'matria.community-liked-posts';

function readLikedPostIds(): string[] {
  try {
    const raw = window.localStorage.getItem(LIKED_POSTS_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function writeLikedPostIds(ids: string[]): void {
  window.localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(ids));
}

function getAuthorName(post: CommunityPost): string {
  if (post.is_anonymous || !post.author_name) {
    return 'Anonymous Mama';
  }

  return post.author_name;
}

function formatPostTime(value: string): string {
  const normalizedValue = /z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const createdAt = new Date(normalizedValue).getTime();
  if (Number.isNaN(createdAt)) {
    return '';
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(value).toLocaleDateString();
}

function resolveAuthorName(user: ReturnType<typeof useAuth>['user']): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata || {};
  const nickname = typeof metadata.nickname === 'string' ? metadata.nickname.trim() : '';
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  return nickname || fullName || user.email?.split('@')[0] || 'Community member';
}

export default function CommunityPage() {
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => readLikedPostIds());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const likedPostSet = useMemo(() => new Set(likedPostIds), [likedPostIds]);
  const communityStats = useMemo(() => {
    const anonymousPosts = posts.filter((post) => post.is_anonymous).length;
    const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);

    return [
      { label: 'Visible posts', value: posts.length, icon: MessageCircle, color: 'bg-sage-100 text-sage-600' },
      { label: 'Anonymous posts', value: anonymousPosts, icon: Sparkles, color: 'bg-blush-100 text-blush-500' },
      { label: 'Total likes', value: totalLikes, icon: Heart, color: 'bg-warm-100 text-warm-500' },
    ];
  }, [posts]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    void listCommunityPosts()
      .then((response) => {
        if (mounted) {
          setPosts(response.items);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load community posts');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const handleSubmit = async () => {
    const content = newPost.trim();
    if (!content) {
      toast.error('Please write something before posting');
      return;
    }

    setSubmitting(true);
    try {
      const shouldPostAnonymously = isAnonymous || isGuest || !user;
      const createdPost = await createCommunityPost({
        content,
        user_id: shouldPostAnonymously ? null : user?.id ?? null,
        author_name: shouldPostAnonymously ? null : resolveAuthorName(user),
        is_anonymous: shouldPostAnonymously,
        original_language: language,
      });

      setPosts((current) => [createdPost, ...current]);
      setNewPost('');
      toast.success('Your post is now visible in the community');
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Could not create post');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    const nextLiked = !likedPostSet.has(post.id);

    try {
      const updatedPost = await updateCommunityPostLike(post.id, nextLiked);
      const nextLikedIds = nextLiked
        ? [...likedPostIds, post.id]
        : likedPostIds.filter((id) => id !== post.id);

      setLikedPostIds(nextLikedIds);
      writeLikedPostIds(nextLikedIds);
      setPosts((current) => current.map((item) => (item.id === post.id ? updatedPost : item)));
    } catch (likeError) {
      toast.error(likeError instanceof Error ? likeError.message : 'Could not update like');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 pb-32">
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-display-sm font-bold text-foreground mb-2">{t('community.title')}</h1>
            <p className="text-body-lg text-muted-foreground">A safe space to share, connect, and support each other</p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage-100">
                    <Sparkles className="h-5 w-5 text-sage-500" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(event) => setNewPost(event.target.value)}
                      placeholder={t('community.post.placeholder')}
                      maxLength={2000}
                      className="min-h-[96px] w-full resize-none border-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <button
                        onClick={() => setIsAnonymous((value) => !value)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          isAnonymous ? 'bg-sage-100 text-sage-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        {t('community.post.anonymous')}
                      </button>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{newPost.length}/2000</span>
                        <Button variant="hero" size="sm" className="gap-2" disabled={submitting} onClick={handleSubmit}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {loading && (
                <div className="card-elevated p-8 text-center text-muted-foreground">Loading community posts...</div>
              )}

              {!loading && error && (
                <div className="card-elevated p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                    <div>
                      <h2 className="font-semibold text-foreground">Community unavailable</h2>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => setReloadKey((value) => value + 1)}>
                    <RefreshCcw className="h-4 w-4" /> Retry
                  </Button>
                </div>
              )}

              {!loading && !error && posts.length === 0 && (
                <div className="card-elevated p-8 text-center text-muted-foreground">
                  No posts yet. Be the first to share something supportive.
                </div>
              )}

              {!loading && !error && posts.length > 0 && (
                <div className="space-y-4">
                  {posts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="card-elevated p-4"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${post.is_anonymous ? 'bg-sage-100' : 'bg-blush-100'}`}>
                          {post.is_anonymous ? <Sparkles className="h-5 w-5 text-sage-500" /> : <Users className="h-5 w-5 text-blush-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{getAuthorName(post)}</span>
                            {post.is_anonymous && <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs text-sage-600">Anonymous</span>}
                          </div>
                          <span className="text-sm text-muted-foreground">{formatPostTime(post.created_at)}</span>
                        </div>
                      </div>

                      <p className="mb-4 whitespace-pre-wrap leading-relaxed text-foreground">{post.content}</p>

                      <div className="flex items-center gap-4 border-t border-border pt-3">
                        <button
                          onClick={() => toggleLike(post)}
                          className={`flex items-center gap-2 text-sm transition-colors ${
                            likedPostSet.has(post.id) ? 'text-blush-500' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Heart className={`h-5 w-5 ${likedPostSet.has(post.id) ? 'fill-current' : ''}`} />
                          <span>{post.like_count}</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-elevated p-4">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-sage-500" />
                  <h3 className="font-semibold text-foreground">Community activity</h3>
                </div>
                <div className="space-y-2">
                  {communityStats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card-elevated p-4">
                <h3 className="mb-3 font-semibold text-foreground">Need support?</h3>
                <p className="mb-4 text-sm text-muted-foreground">Browse our support directory to find services that match your needs.</p>
                <Link to="/support">
                  <Button variant="soft" className="w-full gap-2">
                    <Heart className="h-4 w-4" /> Find Support
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
