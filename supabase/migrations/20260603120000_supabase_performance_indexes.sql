-- Índices de performance (auditoria Supabase — plano gratuito)

-- Prefix slug em frases_index (espelha frases.slug text_pattern_ops)
create index if not exists frases_index_slug_pattern_idx
  on public.frases_index (slug text_pattern_ops);

-- Paginação por categoria + popularidade (substitui OFFSET profundo)
create index if not exists frases_index_categoria_pop_id_idx
  on public.frases_index (categoria_id, popularidade desc, id);

-- Worker cron translation_requests (covering)
create index if not exists translation_requests_worker_idx
  on public.translation_requests (status, request_count desc, requested_at asc)
  include (frase_id, locale)
  where status = 'pending';
