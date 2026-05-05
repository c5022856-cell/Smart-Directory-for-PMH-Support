import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Eye, EyeOff, Heart,
  LogOut, MessageCircle, RefreshCcw, Shield, Trash2, UserX, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  deleteCommunityPost,
  listCommunityPosts,
  recommendServices,
  updateCommunityPostStatus,
} from '@/lib/ai';
import type { CommunityPost, ServiceRecommendation } from '@/types/ai';

type AdminTab = 'users' | 'community' | 'services' | 'stats';
type AppRole = Enums<'app_role'>;

const adminTabs = [
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'community' as const, label: 'Community', icon: MessageCircle },
  { id: 'services' as const, label: 'Directory', icon: Heart },
  { id: 'stats' as const, label: 'Statistics', icon: BarChart3 },
];

function formatAdminFetchError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error || fallback);

  if (error instanceof TypeError || /failed to fetch/i.test(message)) {
    return `${fallback}. Make sure the backend server is running, then refresh.`;
  }

  return message || fallback;
}

export default function AdminPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast.error('Please enter admin credentials');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (error) {
        toast.error(error.message || 'Admin sign-in failed');
        setLoading(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) {
        toast.error('Authentication failed');
        setLoading(false);
        return;
      }

      const { data: hasAdminRole } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (!hasAdminRole) {
        toast.error('You do not have admin privileges');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setCurrentAdminId(userId);
      setIsAuthenticated(true);
    } catch (loginError) {
      toast.error(formatAdminFetchError(loginError, 'Admin sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentAdminId(null);
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero-gradient p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-100">
              <Shield className="h-8 w-8 text-sage-500" />
            </div>
            <h1 className="mb-2 text-heading-lg font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground">Sign in with your admin credentials</p>
          </div>
          <div className="card-elevated space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                name="matria-admin-email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="Admin email"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                name="matria-admin-password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Admin password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            </div>
            <Button variant="hero" size="lg" className="w-full gap-2" disabled={loading} onClick={handleAdminLogin}>
              {loading ? 'Verifying...' : 'Sign In'}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <button onClick={() => navigate('/')} className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground">
              Back to main site
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sage-400 to-sage-500">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">MATRIA Admin</h1>
              <p className="text-xs text-muted-foreground">Management Dashboard</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="min-h-[calc(100vh-73px)] w-64 border-r border-border bg-card p-4">
          <nav className="space-y-1">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-sage-100 text-sage-600' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <AdminContent tab={activeTab} currentAdminId={currentAdminId} />
        </main>
      </div>
    </div>
  );
}

function AdminContent({ tab, currentAdminId }: { tab: AdminTab; currentAdminId: string | null }) {
  if (tab === 'users') return <UsersManagement currentAdminId={currentAdminId} />;
  if (tab === 'community') return <CommunityModeration />;
  if (tab === 'services') return <DirectoryServices />;
  return <StatsDashboard />;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  nickname: string | null;
  phone: string | null;
  motherhood_stage: string | null;
  preferred_language: string | null;
  created_at: string;
}

function UsersManagement({ currentAdminId }: { currentAdminId: string | null }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, nickname, phone, motherhood_stage, preferred_language, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    const { data: userRoles } = await supabase.from('user_roles').select('user_id, role');
    const rolesMap: Record<string, AppRole[]> = {};
    userRoles?.forEach((roleRow) => {
      if (!rolesMap[roleRow.user_id]) rolesMap[roleRow.user_id] = [];
      rolesMap[roleRow.user_id].push(roleRow.role);
    });

    setUsers(profiles || []);
    setRoles(rolesMap);
    setLoading(false);
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (userId === currentAdminId) {
      toast.error('You cannot delete your own admin profile while signed in');
      return;
    }

    if (!confirm(`Are you sure you want to delete the profile for "${fullName || 'this user'}"?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    if (error) {
      toast.error('Failed to delete user profile');
      return;
    }
    toast.success('User profile deleted');
    void fetchUsers();
  };

  const handleToggleRole = async (userId: string, role: AppRole) => {
    const userRoles = roles[userId] || [];
    if (userId === currentAdminId && role === 'admin' && userRoles.includes('admin')) {
      toast.error('You cannot remove your own admin role while signed in');
      return;
    }

    if (userRoles.includes(role)) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      if (error) { toast.error('Failed to remove role'); return; }
      toast.success(`Removed ${role} role`);
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) { toast.error('Failed to assign role'); return; }
      toast.success(`Assigned ${role} role`);
    }
    void fetchUsers();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-display-sm font-bold text-foreground">Manage Users</h2>
          <p className="text-body-md text-muted-foreground">View profiles and manage admin roles.</p>
        </div>
        <Badge variant="secondary" className="text-sm">{users.length} users</Badge>
      </div>
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div>{user.full_name || '--'}</div>
                    {user.nickname && <div className="text-xs text-muted-foreground">@{user.nickname}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '--'}</TableCell>
                  <TableCell>
                    {user.motherhood_stage ? <Badge variant="outline" className="text-xs">{user.motherhood_stage}</Badge> : '--'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.preferred_language || 'en'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(roles[user.user_id] || []).map((role) => (
                        <Badge key={role} variant={role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">{role}</Badge>
                      ))}
                      {!(roles[user.user_id]?.length) && <span className="text-xs text-muted-foreground">user</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleRole(user.user_id, 'admin')} title={roles[user.user_id]?.includes('admin') ? 'Remove admin' : 'Make admin'}>
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.user_id, user.full_name)} className="text-destructive hover:text-destructive">
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}

function CommunityModeration() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listCommunityPosts(true);
      setPosts(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, []);

  const handleToggleVisibility = async (post: CommunityPost) => {
    const nextStatus = post.status === 'visible' ? 'hidden' : 'visible';
    try {
      const updatedPost = await updateCommunityPostStatus(post.id, nextStatus);
      setPosts((current) => current.map((item) => (item.id === post.id ? updatedPost : item)));
      toast.success(nextStatus === 'visible' ? 'Post restored' : 'Post hidden');
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Failed to update post');
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    if (!confirm('Delete this community post permanently?')) return;
    try {
      await deleteCommunityPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success('Post deleted');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete post');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-display-sm font-bold text-foreground">Moderate Community</h2>
          <p className="text-body-md text-muted-foreground">Hide, restore, or delete community posts.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void fetchPosts()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No community posts yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm text-foreground">{post.content}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.is_anonymous ? 'Anonymous Mama' : post.author_name || 'Community member'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'visible' ? 'secondary' : 'destructive'}>{post.status}</Badge>
                  </TableCell>
                  <TableCell>{post.like_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleVisibility(post)}>
                        {post.status === 'visible' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(post)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}

function DirectoryServices() {
  const [services, setServices] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await recommendServices({ limit: 50 });
      setServices(response.items);
    } catch (loadError) {
      setError(formatAdminFetchError(loadError, 'Failed to load directory services'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServices();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-display-sm font-bold text-foreground">Directory Services</h2>
          <p className="text-body-md text-muted-foreground">Read-only view of the services currently served by the AI backend.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void fetchServices()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      <div className="card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading services...</div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell><Badge variant="outline">{service.support_type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{service.location || '--'}</TableCell>
                  <TableCell className="text-muted-foreground">{service.phone || '--'}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{service.website || '--'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  );
}

function StatsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    visiblePosts: 0,
    hiddenPosts: 0,
    services: 0,
  });

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);

    const [usersResult, postsResult, servicesResult] = await Promise.allSettled([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      listCommunityPosts(true),
      recommendServices({ limit: 50 }),
    ]);

    const nextStats = {
      users: 0,
      posts: 0,
      visiblePosts: 0,
      hiddenPosts: 0,
      services: 0,
    };
    const nextWarnings: string[] = [];

    if (usersResult.status === 'fulfilled') {
      const { count, error: userError } = usersResult.value;
      if (userError) {
        nextWarnings.push(formatAdminFetchError(userError, 'Failed to load user count'));
      } else {
        nextStats.users = count || 0;
      }
    } else {
      nextWarnings.push(formatAdminFetchError(usersResult.reason, 'Failed to load user count'));
    }

    if (postsResult.status === 'fulfilled') {
      nextStats.posts = postsResult.value.items.length;
      nextStats.visiblePosts = postsResult.value.items.filter((post) => post.status === 'visible').length;
      nextStats.hiddenPosts = postsResult.value.items.filter((post) => post.status === 'hidden').length;
    } else {
      nextWarnings.push(formatAdminFetchError(postsResult.reason, 'Failed to load community post statistics'));
    }

    if (servicesResult.status === 'fulfilled') {
      nextStats.services = servicesResult.value.items.length;
    } else {
      nextWarnings.push(formatAdminFetchError(servicesResult.reason, 'Failed to load directory service statistics'));
    }

    setStats(nextStats);
    setWarnings(nextWarnings);
    if (nextWarnings.length === 3) {
      setError('Live statistics could not be loaded. Start the backend, verify Supabase is reachable, then refresh.');
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const cards = [
    { label: 'Users', value: stats.users },
    { label: 'Community posts', value: stats.posts },
    { label: 'Visible posts', value: stats.visiblePosts },
    { label: 'Hidden posts', value: stats.hiddenPosts },
    { label: 'Directory services', value: stats.services },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-display-sm font-bold text-foreground">Usage Statistics</h2>
          <p className="text-body-md text-muted-foreground">Basic live counts from Supabase and the AI backend.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void fetchStats()}>
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      {loading ? (
        <div className="card-elevated p-8 text-center text-muted-foreground">Loading statistics...</div>
      ) : error ? (
        <div className="card-elevated p-8 text-center text-destructive">{error}</div>
      ) : (
        <>
          {warnings.length > 0 && (
            <div className="card-elevated mb-4 p-4 text-sm text-muted-foreground">
              Some live counts could not be loaded. Check the app connections and refresh.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="card-elevated p-5">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
