-- MetaMensagem — índice multilíngue democrático (Phase 1, custo zero)
-- Uma linha por (frase_id, language) com search_text + keywords traduzidos.
-- Busca consulta TODAS as línguas — "amor", "love", "amour" encontram a mesma frase.

-- ---------------------------------------------------------------------------
-- Tabela: frase_search_index
-- ---------------------------------------------------------------------------
create table if not exists public.frase_search_index (
  id bigserial primary key,
  frase_id text not null,
  language text not null
    constraint frase_search_index_language_check check (public.mm_is_seo_locale(language)),
  search_text text not null default '',
  keywords text[] not null default '{}',
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(search_text, ''))
  ) stored,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint frase_search_index_unique_frase_language unique (frase_id, language),
  constraint frase_search_index_frase_fk
    foreign key (frase_id) references public.frases_index (id) on delete cascade
);

comment on table public.frase_search_index is
  'Índice de busca multilíngue — uma linha por idioma; consulta democrática em mm_search_frases_index';
comment on column public.frase_search_index.search_text is
  'Texto traduzido + autor/categoria (≤480 chars) para tsvector';
comment on column public.frase_search_index.search_vector is
  'Full-text em search_text (GIN); keywords têm GIN próprio + ILIKE na RPC';
comment on column public.frase_search_index.keywords is
  'Tokens + sinônimos temáticos cross-language (≤24 termos)';

create index if not exists frase_search_index_frase_id_idx
  on public.frase_search_index (frase_id);

create index if not exists frase_search_index_language_idx
  on public.frase_search_index (language);

create index if not exists frase_search_index_keywords_gin_idx
  on public.frase_search_index using gin (keywords);

create index if not exists frase_search_index_search_vector_gin_idx
  on public.frase_search_index using gin (search_vector);

drop trigger if exists frase_search_index_set_updated_at on public.frase_search_index;
create trigger frase_search_index_set_updated_at
  before update on public.frase_search_index
  for each row
  execute function public.mm_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — leitura pública; escrita service_role (backfill + hooks)
-- ---------------------------------------------------------------------------
alter table public.frase_search_index enable row level security;

drop policy if exists frase_search_index_select_public on public.frase_search_index;
create policy frase_search_index_select_public
  on public.frase_search_index
  for select
  to anon, authenticated
  using (true);

drop policy if exists frase_search_index_service_all on public.frase_search_index;
create policy frase_search_index_service_all
  on public.frase_search_index
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- RPC democrática — title (frases_index) + texto/tags multilíngue
-- ---------------------------------------------------------------------------
drop function if exists public.mm_search_frases_index(text, integer, integer);

create or replace function public.mm_search_frases_index(
  p_query text,
  p_limit integer default 24,
  p_offset integer default 0,
  p_locale text default null,
  p_categoria_id smallint default null,
  p_tag_ids integer[] default null
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
      end as tsq
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
        ts_rank_cd(fsi.search_vector, (select tsq from q))
        * case
            when (select loc from locale_boost) is not null
              and fsi.language = (select loc from locale_boost)
            then 1.15
            else 1.0
          end
      ) as rank_score
    from public.frase_search_index fsi, q
    where (select raw from q) <> ''
      and (
        fsi.search_vector @@ (select tsq from q)
        or exists (
          select 1
          from unnest(fsi.keywords) kw
          where kw ilike '%' || (select raw from q) || '%'
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
          when exists (
            select 1
            from unnest(fi.palavras_busca) kw
            where kw ilike '%' || (select raw from q) || '%'
          ) then 0.05
          else 0
        end
      ) as rank_score
    from public.frases_index fi, q
    where (select raw from q) <> ''
      and (
        fi.search_vector @@ (select tsq from q)
        or exists (
          select 1
          from unnest(fi.palavras_busca) kw
          where kw ilike '%' || (select raw from q) || '%'
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

comment on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[]) is
  'Busca democrática multilíngue: frase_search_index (todas as línguas) + frases_index (título/tags).';

grant execute on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[]) to anon, authenticated;
