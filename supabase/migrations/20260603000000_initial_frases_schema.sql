-- MetaMensagem — schema inicial (frases + cache de traduções)
-- Alinhado a FraseDetalheView / FraseCms / detailLookup / persistentStore

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.mm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Locales SEO usados na URL e no cache de tradução (lib/i18n/locales.ts)
create or replace function public.mm_is_seo_locale(locale text)
returns boolean
language sql
immutable
as $$
  select locale in ('pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi');
$$;

-- ---------------------------------------------------------------------------
-- Tabela: frases
-- ---------------------------------------------------------------------------
create table if not exists public.frases (
  id text primary key,
  slug text not null,
  frase_original text not null,
  autor_original text not null default 'Anônimo',
  autor_slug text,
  categoria text not null default 'reflexao',
  contextos text[] not null default '{}',
  palavras_chave text[] not null default '{}',
  explicacao text not null default '',
  ano_ou_data text,
  fontes text,
  observacao text,
  autor_tipo text,
  nacionalidade text,
  nascimento_falecimento text,
  language_original text not null default 'pt'
    constraint frases_language_original_check check (public.mm_is_seo_locale(language_original)),
  popularidade integer not null default 0,
  shard text,
  semantica jsonb not null default '{}',
  seo jsonb not null default '{}',
  informacoes jsonb not null default '{}',
  -- Embeddings (pgvector): preencher quando houver pipeline de busca semântica
  embedding extensions.vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint frases_slug_lowercase check (slug = lower(slug)),
  constraint frases_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

comment on table public.frases is 'Frases inspiradoras — espelho do acervo CMS / FraseDetalheView';
comment on column public.frases.slug is 'Slug canônico (único, minúsculas, até 80 chars do texto na origem)';
comment on column public.frases.contextos is 'Tags de contexto (array)';
comment on column public.frases.palavras_chave is 'Palavras-chave exibidas no detalhe (#tag)';
comment on column public.frases.semantica is 'Pacote FraseSemantica (categorias, temas, idioma, etc.)';
comment on column public.frases.seo is 'Pacote FraseSeoPack (titleSeo, canonicalSlug, keywordsSeo, …)';
comment on column public.frases.informacoes is 'Auditoria: ultima_atualizacao, confiabilidade, curadoria_ia, enriquecimento_fase2';
comment on column public.frases.embedding is 'Vetor opcional para busca semântica futura (dimensão 1536 — ajustável)';

create unique index if not exists frases_slug_unique_idx
  on public.frases (slug);

create index if not exists frases_slug_btree_idx
  on public.frases using btree (slug);

create index if not exists frases_autor_slug_idx
  on public.frases (autor_slug)
  where autor_slug is not null;

create index if not exists frases_categoria_idx
  on public.frases (categoria);

create index if not exists frases_language_original_idx
  on public.frases (language_original);

create index if not exists frases_contextos_gin_idx
  on public.frases using gin (contextos);

create index if not exists frases_palavras_chave_gin_idx
  on public.frases using gin (palavras_chave);

create index if not exists frases_semantica_gin_idx
  on public.frases using gin (semantica jsonb_path_ops);

create index if not exists frases_updated_at_idx
  on public.frases (updated_at desc);

-- Busca por prefixo de slug (links compartilhados truncados / resolução parcial)
create index if not exists frases_slug_pattern_idx
  on public.frases (slug text_pattern_ops);

-- Índice vetorial (descomente quando embeddings estiverem populados)
-- create index if not exists frases_embedding_hnsw_idx
--   on public.frases using hnsw (embedding extensions.vector_cosine_ops);

drop trigger if exists frases_set_updated_at on public.frases;
create trigger frases_set_updated_at
  before update on public.frases
  for each row
  execute function public.mm_set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabela: frases_traducoes (cache i18n)
-- ---------------------------------------------------------------------------
create table if not exists public.frases_traducoes (
  id uuid primary key default gen_random_uuid(),
  frase_id text not null references public.frases (id) on delete cascade,
  locale text not null
    constraint frases_traducoes_locale_check check (public.mm_is_seo_locale(locale)),
  texto text not null,
  explicacao text,
  source_hash text not null,
  locale_origem text not null default 'pt'
    constraint frases_traducoes_origem_check check (public.mm_is_seo_locale(locale_origem)),
  provider text not null default 'api'
    constraint frases_traducoes_provider_check check (provider in ('api', 'human', 'ai', 'import')),
  is_official boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint frases_traducoes_unique_frase_locale unique (frase_id, locale)
);

comment on table public.frases_traducoes is 'Cache de traduções por frase/locale (substitui shards / IndexedDB)';
comment on column public.frases_traducoes.source_hash is 'Hash do frase_original na gravação — invalida cache se o texto fonte mudar';
comment on column public.frases_traducoes.texto is 'Texto traduzido exibido em FraseDetalheView (display.texto)';

create index if not exists frases_traducoes_frase_id_idx
  on public.frases_traducoes (frase_id);

create index if not exists frases_traducoes_locale_idx
  on public.frases_traducoes (locale);

create index if not exists frases_traducoes_lookup_idx
  on public.frases_traducoes (frase_id, locale, source_hash);

-- Resolução por slug sem join pesado em leituras frequentes
create index if not exists frases_traducoes_frase_locale_official_idx
  on public.frases_traducoes (frase_id, locale)
  where is_official = true;

drop trigger if exists frases_traducoes_set_updated_at on public.frases_traducoes;
create trigger frases_traducoes_set_updated_at
  before update on public.frases_traducoes
  for each row
  execute function public.mm_set_updated_at();

-- ---------------------------------------------------------------------------
-- View auxiliar (opcional) — compatível com leitura por slug
-- ---------------------------------------------------------------------------
create or replace view public.frases_por_slug as
select
  f.*,
  f.slug as slug_canonical
from public.frases f;

comment on view public.frases_por_slug is 'Leitura direta por slug; use com filtro where slug = $1';

-- ---------------------------------------------------------------------------
-- RLS (leitura pública do conteúdo; escrita restrita ao service role)
-- ---------------------------------------------------------------------------
alter table public.frases enable row level security;
alter table public.frases_traducoes enable row level security;

drop policy if exists frases_select_public on public.frases;
create policy frases_select_public
  on public.frases
  for select
  to anon, authenticated
  using (true);

drop policy if exists frases_traducoes_select_public on public.frases_traducoes;
create policy frases_traducoes_select_public
  on public.frases_traducoes
  for select
  to anon, authenticated
  using (is_official = true);

-- Inserção/atualização via service_role ou políticas admin futuras
drop policy if exists frases_service_all on public.frases;
create policy frases_service_all
  on public.frases
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists frases_traducoes_service_all on public.frases_traducoes;
create policy frases_traducoes_service_all
  on public.frases_traducoes
  for all
  to service_role
  using (true)
  with check (true);
