-- Fase 10: BentoNutriClub. Comunidade por nutricionista; autoria pública minimizada; moderação pela equipe.
create function community_of(uid uuid) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce((select nutritionist_id from patients where id = uid), (select id from nutritionists where id = uid)) $$;
create function has_public_image_consent(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from image_consents where patient_id = pid and consent_type = 'public_use' and accepted and revoked_at is null) $$;
create function is_staff() returns boolean language sql stable as $$ select auth_role() in ('nutritionist','admin') $$;

create table community_challenges (
  id uuid primary key default gen_random_uuid(), nutritionist_id uuid not null references nutritionists(id),
  title text not null, description text, starts_on date not null, ends_on date not null check (ends_on >= starts_on), created_at timestamptz not null default now()
);
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references nutritionists(id),            -- comunidade do nutricionista
  author_id uuid not null default auth.uid(),
  kind text not null check (kind in ('meal','achievement','recipe','tip','substitution','challenge','official')),
  body text not null check (length(body) between 1 and 2000),
  image_path text check (image_path is null or image_path like 'community-images/%'),
  challenge_id uuid references community_challenges(id),
  status text not null default 'visible' check (status in ('visible','hidden','deleted')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table community_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references community_posts(id),
  author_id uuid not null default auth.uid(), body text not null check (length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible','hidden','deleted')), created_at timestamptz not null default now()
);
create table community_likes (
  post_id uuid not null references community_posts(id), user_id uuid not null default auth.uid(), created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on community_posts(community_id, created_at desc); create index on community_comments(post_id, created_at);
alter table community_challenges enable row level security; alter table community_posts enable row level security;
alter table community_comments enable row level security; alter table community_likes enable row level security;

create policy ch_r on community_challenges for select using (nutritionist_id = community_of(auth.uid()) or is_admin());
create policy ch_w on community_challenges for all using (nutritionist_id = auth.uid() or is_admin()) with check (nutritionist_id = auth.uid() or is_admin());
-- leitura: membros da comunidade veem publicações visíveis; equipe vê também ocultas
create policy po_r on community_posts for select using (
  (community_id = community_of(auth.uid()) and (status = 'visible' or is_staff() or author_id = auth.uid())) or is_admin());
create policy po_i on community_posts for insert with check (
  author_id = auth.uid() and community_id = community_of(auth.uid())
  and (kind <> 'official' or is_staff())
  and (image_path is null or (is_staff() or has_public_image_consent(auth.uid()))));
create policy po_u on community_posts for update using ((community_id = auth.uid() and is_staff()) or is_admin() or author_id = auth.uid())
  with check ((community_id = auth.uid() and is_staff()) or is_admin() or (author_id = auth.uid() and status in ('visible','deleted') and featured = false));
create policy co_r on community_comments for select using (exists (select 1 from community_posts p where p.id = post_id and p.community_id = community_of(auth.uid())) and (status = 'visible' or is_staff() or author_id = auth.uid()));
create policy co_i on community_comments for insert with check (author_id = auth.uid() and exists (select 1 from community_posts p where p.id = post_id and p.status = 'visible' and p.community_id = community_of(auth.uid())));
create policy co_u on community_comments for update using ((is_staff() and exists (select 1 from community_posts p where p.id = post_id and p.community_id = auth.uid())) or author_id = auth.uid());
create policy li_r on community_likes for select using (exists (select 1 from community_posts p where p.id = post_id and p.community_id = community_of(auth.uid())));
create policy li_i on community_likes for insert with check (user_id = auth.uid() and exists (select 1 from community_posts p where p.id = post_id and p.status = 'visible' and p.community_id = community_of(auth.uid())));
create policy li_d on community_likes for delete using (user_id = auth.uid());
create trigger po_audit after insert or update on community_posts for each row execute function audit_row();

-- Feed público: expõe apenas nome preferencial (ou primeiro nome); nunca nome completo, telefone ou dados clínicos.
create view community_feed with (security_invoker = true) as
select p.id, p.community_id, p.kind, p.body, p.image_path, p.featured, p.created_at, p.author_id,
  coalesce(nullif(trim(pt.preferred_name), ''), split_part(pr.full_name, ' ', 1)) as author_name,
  (select count(*) from community_likes l where l.post_id = p.id) as likes,
  (select count(*) from community_comments c where c.post_id = p.id and c.status = 'visible') as comments
from community_posts p join profiles pr on pr.id = p.author_id left join patients pt on pt.id = p.author_id
where p.status = 'visible';
-- bucket próprio e privado: nunca o bucket de fotos clínicas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images','community-images', false, 5242880, array['image/webp','image/jpeg']) on conflict (id) do update set public = false;
