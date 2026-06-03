-- Rollup diário + views Top Frases + RPC get_top_frases (custo zero)

-- ---------------------------------------------------------------------------
-- Rollup diário (permite dia / semana / mês reais)
-- ---------------------------------------------------------------------------
create table if not exists public.frase_metrics_daily (
  frase_id text not null references public.frases (id) on delete cascade,
  metric_date date not null default (timezone('utc', now())::date),
  views bigint not null default 0,
  shares bigint not null default 0,
  translation_requests bigint not null default 0,
  search_hits bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint frase_metrics_daily_pk primary key (frase_id, metric_date),
  constraint frase_metrics_daily_views_nonneg check (views >= 0),
  constraint frase_metrics_daily_shares_nonneg check (shares >= 0),
  constraint frase_metrics_daily_tr_nonneg check (translation_requests >= 0),
  constraint frase_metrics_daily_search_nonneg check (search_hits >= 0)
);

comment on table public.frase_metrics_daily is
  'Métricas por frase e dia UTC — base para rankings dia/semana/mês';

create index if not exists frase_metrics_daily_date_idx
  on public.frase_metrics_daily (metric_date desc, frase_id);

alter table public.frase_metrics_daily enable row level security;

drop policy if exists frase_metrics_daily_select_public on public.frase_metrics_daily;
create policy frase_metrics_daily_select_public
  on public.frase_metrics_daily
  for select
  to anon, authenticated
  using (true);

drop policy if exists frase_metrics_daily_service_all on public.frase_metrics_daily;
create policy frase_metrics_daily_service_all
  on public.frase_metrics_daily
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Score ponderado (compartilhamento > tradução > busca > view)
-- ---------------------------------------------------------------------------
create or replace function public.mm_frase_popularity_score(
  p_views numeric,
  p_search_hits numeric,
  p_shares numeric,
  p_translation_requests numeric
)
returns numeric
language sql
immutable
as $$
  select
    (coalesce(p_views, 0) * 1)
    + (coalesce(p_search_hits, 0) * 2)
    + (coalesce(p_shares, 0) * 5)
    + (coalesce(p_translation_requests, 0) * 3);
$$;

comment on function public.mm_frase_popularity_score(numeric, numeric, numeric, numeric) is
  'Score = views*1 + search_hits*2 + shares*5 + translation_requests*3';

-- ---------------------------------------------------------------------------
-- Incremento atômico — lifetime + rollup diário
-- ---------------------------------------------------------------------------
create or replace function public.mm_increment_frase_metric(
  p_metric text,
  p_delta bigint default 1,
  p_frase_id text default null,
  p_slug text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_delta bigint := greatest(1, least(coalesce(p_delta, 1), 50));
  v_day date := timezone('utc', now())::date;
begin
  v_id := nullif(trim(coalesce(p_frase_id, '')), '');
  if v_id is null then
    select fi.id into v_id
    from public.frases_index fi
    where fi.slug = lower(trim(coalesce(p_slug, '')))
    limit 1;
  end if;
  if v_id is null then
    return;
  end if;

  insert into public.frase_metrics (frase_id)
  values (v_id)
  on conflict (frase_id) do nothing;

  insert into public.frase_metrics_daily (frase_id, metric_date)
  values (v_id, v_day)
  on conflict (frase_id, metric_date) do nothing;

  case lower(trim(p_metric))
    when 'views' then
      update public.frase_metrics
      set views = views + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
      update public.frase_metrics_daily
      set views = views + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id and metric_date = v_day;
    when 'shares' then
      update public.frase_metrics
      set shares = shares + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
      update public.frase_metrics_daily
      set shares = shares + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id and metric_date = v_day;
    when 'translation_requests' then
      update public.frase_metrics
      set translation_requests = translation_requests + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
      update public.frase_metrics_daily
      set translation_requests = translation_requests + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id and metric_date = v_day;
    when 'search_hits' then
      update public.frase_metrics
      set search_hits = search_hits + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
      update public.frase_metrics_daily
      set search_hits = search_hits + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id and metric_date = v_day;
    else
      null;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- Agregação por período (view interna reutilizável)
-- ---------------------------------------------------------------------------
create or replace view public.frase_metrics_period_agg as
select
  d.frase_id,
  'dia'::text as periodo,
  d.views,
  d.search_hits,
  d.shares,
  d.translation_requests,
  public.mm_frase_popularity_score(d.views, d.search_hits, d.shares, d.translation_requests) as score
from public.frase_metrics_daily d
where d.metric_date = timezone('utc', now())::date

union all

select
  d.frase_id,
  'semana'::text as periodo,
  sum(d.views) as views,
  sum(d.search_hits) as search_hits,
  sum(d.shares) as shares,
  sum(d.translation_requests) as translation_requests,
  public.mm_frase_popularity_score(
    sum(d.views), sum(d.search_hits), sum(d.shares), sum(d.translation_requests)
  ) as score
from public.frase_metrics_daily d
where d.metric_date >= timezone('utc', now())::date - 6
group by d.frase_id

union all

select
  d.frase_id,
  'mes'::text as periodo,
  sum(d.views) as views,
  sum(d.search_hits) as search_hits,
  sum(d.shares) as shares,
  sum(d.translation_requests) as translation_requests,
  public.mm_frase_popularity_score(
    sum(d.views), sum(d.search_hits), sum(d.shares), sum(d.translation_requests)
  ) as score
from public.frase_metrics_daily d
where d.metric_date >= timezone('utc', now())::date - 29
group by d.frase_id

union all

select
  m.frase_id,
  'geral'::text as periodo,
  m.views,
  m.search_hits,
  m.shares,
  m.translation_requests,
  public.mm_frase_popularity_score(m.views, m.search_hits, m.shares, m.translation_requests) as score
from public.frase_metrics m;

comment on view public.frase_metrics_period_agg is
  'Agregados por periodo (dia/semana/mes/geral) com score ponderado';

-- ---------------------------------------------------------------------------
-- Views públicas de ranking (sem ORDER BY fixo — ordenar na RPC)
-- ---------------------------------------------------------------------------
create or replace view public.top_frases_dia as
select
  a.frase_id,
  fi.slug,
  fi.titulo,
  a.views,
  a.search_hits,
  a.shares,
  a.translation_requests,
  a.score
from public.frase_metrics_period_agg a
join public.frases_index fi on fi.id = a.frase_id
where a.periodo = 'dia' and a.score > 0;

create or replace view public.top_frases_semana as
select
  a.frase_id,
  fi.slug,
  fi.titulo,
  a.views,
  a.search_hits,
  a.shares,
  a.translation_requests,
  a.score
from public.frase_metrics_period_agg a
join public.frases_index fi on fi.id = a.frase_id
where a.periodo = 'semana' and a.score > 0;

create or replace view public.top_frases_mes as
select
  a.frase_id,
  fi.slug,
  fi.titulo,
  a.views,
  a.search_hits,
  a.shares,
  a.translation_requests,
  a.score
from public.frase_metrics_period_agg a
join public.frases_index fi on fi.id = a.frase_id
where a.periodo = 'mes' and a.score > 0;

create or replace view public.top_frases_geral as
select
  a.frase_id,
  fi.slug,
  fi.titulo,
  a.views,
  a.search_hits,
  a.shares,
  a.translation_requests,
  a.score
from public.frase_metrics_period_agg a
join public.frases_index fi on fi.id = a.frase_id
where a.periodo = 'geral' and a.score > 0;

grant select on public.frase_metrics_period_agg to anon, authenticated;
grant select on public.top_frases_dia to anon, authenticated;
grant select on public.top_frases_semana to anon, authenticated;
grant select on public.top_frases_mes to anon, authenticated;
grant select on public.top_frases_geral to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC leve — id, slug, texto, autor, categoria, score
-- ---------------------------------------------------------------------------
create or replace function public.get_top_frases(
  p_periodo text default 'semana',
  p_limite integer default 20
)
returns table (
  id text,
  slug text,
  texto text,
  autor text,
  categoria text,
  score numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with periodo as (
    select case lower(trim(coalesce(p_periodo, 'semana')))
      when 'dia' then 'dia'
      when 'semana' then 'semana'
      when 'mes' then 'mes'
      when 'geral' then 'geral'
      when 'all' then 'geral'
      when 'total' then 'geral'
      else 'semana'
    end as key
  ),
  ranked as (
    select
      a.frase_id,
      a.score,
      a.views,
      a.search_hits,
      a.shares,
      a.translation_requests
    from public.frase_metrics_period_agg a
    cross join periodo p
    where a.periodo = p.key
      and a.score > 0
  )
  select
    fi.id,
    fi.slug,
    coalesce(nullif(trim(f.frase_original), ''), fi.titulo) as texto,
    coalesce(nullif(trim(f.autor_original), ''), 'Anônimo') as autor,
    coalesce(nullif(trim(c.slug), ''), nullif(trim(f.categoria), ''), '') as categoria,
    r.score
  from ranked r
  join public.frases_index fi on fi.id = r.frase_id
  left join public.frases f on f.id = fi.id
  left join public.categorias c on c.id = fi.categoria_id
  order by r.score desc, fi.popularidade desc, fi.id
  limit greatest(1, least(coalesce(p_limite, 20), 50));
$$;

comment on function public.get_top_frases(text, integer) is
  'Top frases por periodo (dia|semana|mes|geral). Retorno leve para UI/SEO.';

grant execute on function public.get_top_frases(text, integer) to anon, authenticated;
