create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  is_anonymous boolean not null default true,
  original_language text not null default 'en',
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;

drop trigger if exists update_community_posts_updated_at on public.community_posts;
create trigger update_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.update_updated_at_column();

create or replace function public.update_community_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set like_count = like_count + 1
    where id = new.post_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.community_posts
    set like_count = greatest(like_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists community_post_like_inserted on public.community_post_likes;
create trigger community_post_like_inserted
after insert on public.community_post_likes
for each row
execute function public.update_community_post_like_count();

drop trigger if exists community_post_like_deleted on public.community_post_likes;
create trigger community_post_like_deleted
after delete on public.community_post_likes
for each row
execute function public.update_community_post_like_count();

drop policy if exists "Visible community posts are readable by everyone" on public.community_posts;
create policy "Visible community posts are readable by everyone"
on public.community_posts
for select
using (status = 'visible' or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users and guests can create community posts" on public.community_posts;
create policy "Users and guests can create community posts"
on public.community_posts
for insert
with check (
  status = 'visible'
  and (
    (auth.uid() is null and user_id is null and is_anonymous = true)
    or (auth.uid() = user_id)
  )
);

drop policy if exists "Owners and admins can update community posts" on public.community_posts;
create policy "Owners and admins can update community posts"
on public.community_posts
for update
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Owners and admins can delete community posts" on public.community_posts;
create policy "Owners and admins can delete community posts"
on public.community_posts
for delete
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users can view own community likes" on public.community_post_likes;
create policy "Users can view own community likes"
on public.community_post_likes
for select
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users can like community posts" on public.community_post_likes;
create policy "Users can like community posts"
on public.community_post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike community posts" on public.community_post_likes;
create policy "Users can unlike community posts"
on public.community_post_likes
for delete
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

grant select, insert, update, delete on public.community_posts to anon, authenticated;
grant select, insert, delete on public.community_post_likes to authenticated;
