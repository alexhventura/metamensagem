-- Busca semântica (GIN overlap) + métricas de popularidade por frase

-- ---------------------------------------------------------------------------
-- frase_metrics — views, shares, translation_requests, search_hits
-- ---------------------------------------------------------------------------
create table if not exists public.frase_metrics (
  frase_id text primary key references public.frases (id) on delete cascade,
  views bigint not null default 0,
  shares bigint not null default 0,
  translation_requests bigint not null default 0,
  search_hits bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint frase_metrics_views_nonneg check (views >= 0),
  constraint frase_metrics_shares_nonneg check (shares >= 0),
  constraint frase_metrics_tr_nonneg check (translation_requests >= 0),
  constraint frase_metrics_search_nonneg check (search_hits >= 0)
);

comment on table public.frase_metrics is 'Popularidade agregada por frase (custo zero — incrementos atómicos)';

create index if not exists frase_metrics_views_idx
  on public.frase_metrics (views desc, frase_id);

create index if not exists frase_metrics_shares_idx
  on public.frase_metrics (shares desc, frase_id);

create index if not exists frase_metrics_search_hits_idx
  on public.frase_metrics (search_hits desc, frase_id);

alter table public.frase_metrics enable row level security;

drop policy if exists frase_metrics_select_public on public.frase_metrics;
create policy frase_metrics_select_public
  on public.frase_metrics
  for select
  to anon, authenticated
  using (true);

drop policy if exists frase_metrics_service_all on public.frase_metrics;
create policy frase_metrics_service_all
  on public.frase_metrics
  for all
  to service_role
  using (true)
  with check (true);

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

  case lower(trim(p_metric))
    when 'views' then
      update public.frase_metrics
      set views = views + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
    when 'shares' then
      update public.frase_metrics
      set shares = shares + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
    when 'translation_requests' then
      update public.frase_metrics
      set translation_requests = translation_requests + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
    when 'search_hits' then
      update public.frase_metrics
      set search_hits = search_hits + v_delta, updated_at = timezone('utc', now())
      where frase_id = v_id;
    else
      null;
  end case;
end;
$$;

grant execute on function public.mm_increment_frase_metric(text, bigint, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RPC de busca — overlap semântico via p_semantic_terms (GIN keywords)
-- ---------------------------------------------------------------------------
drop function if exists public.mm_search_frases_index(text, integer, integer, text, smallint, integer[]);

create or replace function public.mm_search_frases_index(
  p_query text,
  p_limit integer default 24,
  p_offset integer default 0,
  p_locale text default null,
  p_categoria_id smallint default null,
  p_tag_ids integer[] default null,
  p_semantic_terms text[] default null
)
returns table (
  id text,
  slug text,
  titulo text
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select
      trim(coalesce(p_query, '')) as raw,
      case
        when trim(coalesce(p_query, '')) = '' then null::tsquery
        else websearch_to_tsquery('simple', trim(p_query))
      end as tsq,
      char_length(trim(coalesce(p_query, ''))) >= 3 as allow_ilike,
      coalesce(
        nullif(array_remove(p_semantic_terms, null), '{}'::text[]),
        case when trim(coalesce(p_query, '')) <> '' then array[trim(p_query)] else null end
      ) as semantic_terms
  ),
  locale_boost as (
    select case
      when public.mm_is_seo_locale(trim(coalesce(p_locale, ''))) then trim(p_locale)
      else null::text
    end as loc
  ),
  multilingual_hits as (
    select
      fsi.frase_id,
      max(
        greatest(
          ts_rank_cd(fsi.search_vector, (select tsq from q))
          * case
              when (select loc from locale_boost) is not null
                and fsi.language = (select loc from locale_boost)
              then 1.15
              else 1.0
            end,
          case
            when (select semantic_terms from q) is not null
              and fsi.keywords && (select semantic_terms from q)
            then 0.14
            else 0
          end
        )
      ) as rank_score
    from public.frase_search_index fsi, q
    where (select raw from q) <> ''
      and (
        fsi.search_vector @@ (select tsq from q)
        or (
          (select semantic_terms from q) is not null
          and fsi.keywords && (select semantic_terms from q)
        )
        or (
          (select allow_ilike from q)
          and exists (
            select 1
            from unnest(fsi.keywords) kw
            where kw ilike '%' || (select raw from q) || '%'
          )
        )
      )
    group by fsi.frase_id
  ),
  index_hits as (
    select
      fi.id as frase_id,
      greatest(
        ts_rank_cd(fi.search_vector, (select tsq from q)),
        case
          when (select allow_ilike from q)
            and exists (
              select 1
              from unnest(fi.palavras_busca) kw
              where kw ilike '%' || (select raw from q) || '%'
            )
          then 0.05
          else 0
        end
      ) as rank_score
    from public.frases_index fi, q
    where (select raw from q) <> ''
      and (
        fi.search_vector @@ (select tsq from q)
        or (
          (select allow_ilike from q)
          and exists (
            select 1
            from unnest(fi.palavras_busca) kw
            where kw ilike '%' || (select raw from q) || '%'
          )
        )
      )
  ),
  combined as (
    select frase_id, max(rank_score) as score
    from (
      select frase_id, rank_score from multilingual_hits
      union all
      select frase_id, rank_score from index_hits
    ) u
    group by frase_id
  )
  select
    fi.id,
    fi.slug,
    fi.titulo
  from public.frases_index fi
  cross join q
  left join combined c on c.frase_id = fi.id
  where (
      (select raw from q) = ''
      or c.frase_id is not null
    )
  and (p_categoria_id is null or fi.categoria_id = p_categoria_id)
  and (
    p_tag_ids is null
    or cardinality(p_tag_ids) = 0
    or fi.tags_ids && p_tag_ids
  )
  order by
    case when (select raw from q) = '' then fi.popularidade else c.score end desc nulls last,
    fi.popularidade desc,
    fi.id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[], text[]) is
  'Busca democrática + semântica (keywords GIN overlap + tsvector).';

grant execute on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[], text[]) to anon, authenticated;
