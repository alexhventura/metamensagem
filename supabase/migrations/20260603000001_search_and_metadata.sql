-- MetaMensagem — índice híbrido de busca (custo zero / <500MB)
-- Catálogo leve no Postgres; corpo completo permanece em shards CDN + frases (detalhe).
-- NÃO executar import em massa até revisar tamanho estimado (~70–120MB para ~450k linhas).

-- View da migração inicial bloqueia ALTER em public.frases (f.* + slug_canonical)
drop view if exists public.frases_por_slug cascade;

-- ---------------------------------------------------------------------------
-- Taxonomia normalizada (slugs estáveis)
-- ---------------------------------------------------------------------------
create table if not exists public.categorias (
  id smallserial primary key,
  slug text not null,
  nome text not null,
  constraint categorias_slug_lowercase check (slug = lower(slug)),
  constraint categorias_slug_unique unique (slug)
);

comment on table public.categorias is 'Categorias principais do acervo (slug = categoriaPrincipal dos shards)';

create table if not exists public.tags (
  id serial primary key,
  slug text not null,
  nome text not null,
  constraint tags_slug_lowercase check (slug = lower(slug)),
  constraint tags_slug_unique unique (slug)
);

comment on table public.tags is 'Tags/contextos normalizados; referenciadas por frases_index.tags_ids';

-- ---------------------------------------------------------------------------
-- Índice leve (~120 chars de título + keywords; sem explicacao/seo/json)
-- ---------------------------------------------------------------------------
create table if not exists public.frases_index (
  id text primary key,
  slug text not null,
  /** Prévia para cards/busca — nunca o texto integral da frase */
  titulo text not null,
  categoria_id smallint not null references public.categorias (id) on delete restrict,
  tags_ids integer[] not null default '{}',
  autor_slug text,
  shard text,
  /** Termos curtos para tsvector (palavras-chave + tags; máx. ~12 termos no import) */
  palavras_busca text[] not null default '{}',
  popularidade smallint not null default 0,
  /** Só titulo na coluna gerada (imutável); palavras_busca tem GIN próprio + RPC combina busca */
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(titulo, ''))
  ) stored,
  created_at timestamptz not null default timezone('utc', now()),
  constraint frases_index_slug_lowercase check (slug = lower(slug)),
  constraint frases_index_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint frases_index_titulo_len check (char_length(titulo) <= 160)
);

comment on table public.frases_index is 'Índice de busca/navegação — metadados mínimos; detalhe via slug + fallback shard';
comment on column public.frases_index.titulo is 'Trecho curto (frase_original truncada ou derivada do slug)';
comment on column public.frases_index.tags_ids is 'IDs em public.tags (preenchidos no script de import)';
comment on column public.frases_index.search_vector is 'Full-text apenas em titulo + palavras_busca (GIN)';

create unique index if not exists frases_index_slug_unique_idx
  on public.frases_index (slug);

create index if not exists frases_index_categoria_id_idx
  on public.frases_index (categoria_id);

create index if not exists frases_index_autor_slug_idx
  on public.frases_index (autor_slug)
  where autor_slug is not null;

create index if not exists frases_index_tags_ids_gin_idx
  on public.frases_index using gin (tags_ids);

create index if not exists frases_index_palavras_busca_gin_idx
  on public.frases_index using gin (palavras_busca);

create index if not exists frases_index_search_vector_gin_idx
  on public.frases_index using gin (search_vector);

create index if not exists frases_index_popularidade_idx
  on public.frases_index (popularidade desc, id);

-- Opcional: vínculo lógico com detalhe completo quando existir em public.frases
alter table public.frases
  add column if not exists categoria_id smallint references public.categorias (id) on delete set null;

comment on column public.frases.categoria_id is 'FK opcional; legado mantém coluna text categoria';

-- ---------------------------------------------------------------------------
-- RLS — leitura pública do índice; escrita só service_role (import em lote)
-- ---------------------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.tags enable row level security;
alter table public.frases_index enable row level security;

drop policy if exists categorias_select_public on public.categorias;
create policy categorias_select_public
  on public.categorias
  for select
  to anon, authenticated
  using (true);

drop policy if exists tags_select_public on public.tags;
create policy tags_select_public
  on public.tags
  for select
  to anon, authenticated
  using (true);

drop policy if exists frases_index_select_public on public.frases_index;
create policy frases_index_select_public
  on public.frases_index
  for select
  to anon, authenticated
  using (true);

drop policy if exists categorias_service_all on public.categorias;
create policy categorias_service_all
  on public.categorias
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists tags_service_all on public.tags;
create policy tags_service_all
  on public.tags
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists frases_index_service_all on public.frases_index;
create policy frases_index_service_all
  on public.frases_index
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- RPC auxiliar (busca textual com limite — PostgREST friendly)
-- ---------------------------------------------------------------------------
create or replace function public.mm_search_frases_index(
  p_query text,
  p_limit integer default 24,
  p_offset integer default 0
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
  select
    fi.id,
    fi.slug,
    fi.titulo
  from public.frases_index fi
  where coalesce(trim(p_query), '') = ''
    or fi.search_vector @@ websearch_to_tsquery('simple', p_query)
    or exists (
      select 1
      from unnest(fi.palavras_busca) kw
      where kw ilike '%' || trim(p_query) || '%'
    )
  order by
    case
      when coalesce(trim(p_query), '') = '' then fi.popularidade
      else ts_rank_cd(fi.search_vector, websearch_to_tsquery('simple', p_query))
    end desc nulls last,
    fi.id
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.mm_search_frases_index is
  'Busca leve: retorna só id, slug, titulo. Detalhe continua fora desta tabela.';

grant execute on function public.mm_search_frases_index(text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- View auxiliar recriada (inclui categoria_id e demais colunas atuais de frases)
-- ---------------------------------------------------------------------------
create or replace view public.frases_por_slug
  with (security_invoker = on)
as
select
  f.*,
  f.slug as slug_canonical
from public.frases f;

comment on view public.frases_por_slug is
  'Leitura direta por slug; use com filtro where slug = $1. security_invoker = on (RLS do cliente).';
