-- Fila persistente de traduções pendentes (enriquece frases_traducoes via cron)

create table if not exists public.translation_requests (
  id uuid primary key default gen_random_uuid(),
  frase_id text not null references public.frases (id) on delete cascade,
  locale text not null
    constraint translation_requests_locale_check check (public.mm_is_seo_locale(locale)),
  status text not null default 'pending'
    constraint translation_requests_status_check check (status in ('pending', 'completed', 'failed')),
  request_count integer not null default 1
    constraint translation_requests_request_count_check check (request_count >= 1),
  requested_at timestamptz not null default timezone('utc', now()),
  last_attempt timestamptz not null default timezone('utc', now()),
  constraint translation_requests_unique_frase_locale unique (frase_id, locale)
);

comment on table public.translation_requests is 'Demanda de tradução quando cache local, Supabase e MyMemory falham';
comment on column public.translation_requests.locale is 'Locale SEO alvo (pt, en, es, …)';
comment on column public.translation_requests.request_count is 'Número de solicitações do utilizador (prioridade do cron)';

create index if not exists translation_requests_pending_idx
  on public.translation_requests (status, request_count desc, requested_at asc)
  where status = 'pending';

alter table public.translation_requests enable row level security;

drop policy if exists translation_requests_service_all on public.translation_requests;
create policy translation_requests_service_all
  on public.translation_requests
  for all
  to service_role
  using (true)
  with check (true);

-- Upsert com incremento atómico de request_count
create or replace function public.mm_enqueue_translation_request(
  p_frase_id text,
  p_locale text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.translation_requests (frase_id, locale, status, request_count, requested_at, last_attempt)
  values (p_frase_id, p_locale, 'pending', 1, timezone('utc', now()), timezone('utc', now()))
  on conflict (frase_id, locale) do update set
    request_count = public.translation_requests.request_count + 1,
    last_attempt = timezone('utc', now()),
    status = case
      when public.translation_requests.status = 'completed' then 'pending'
      else public.translation_requests.status
    end;
end;
$$;

comment on function public.mm_enqueue_translation_request(text, text) is
  'Regista ou incrementa pedido de tradução (API phrase-translation em falha)';

grant execute on function public.mm_enqueue_translation_request(text, text) to service_role;
