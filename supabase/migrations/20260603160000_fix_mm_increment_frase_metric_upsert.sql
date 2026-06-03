-- Fix mm_increment_frase_metric: atomic upsert (evita 409) + só frases existentes

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
  v_metric text := lower(trim(coalesce(p_metric, '')));
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

  if not exists (select 1 from public.frases f where f.id = v_id) then
    return;
  end if;

  case v_metric
    when 'views' then
      insert into public.frase_metrics (frase_id, views, updated_at)
      values (v_id, v_delta, timezone('utc', now()))
      on conflict (frase_id) do update
        set views = public.frase_metrics.views + excluded.views,
            updated_at = excluded.updated_at;

      insert into public.frase_metrics_daily (frase_id, metric_date, views, updated_at)
      values (v_id, v_day, v_delta, timezone('utc', now()))
      on conflict (frase_id, metric_date) do update
        set views = public.frase_metrics_daily.views + excluded.views,
            updated_at = excluded.updated_at;

    when 'shares' then
      insert into public.frase_metrics (frase_id, shares, updated_at)
      values (v_id, v_delta, timezone('utc', now()))
      on conflict (frase_id) do update
        set shares = public.frase_metrics.shares + excluded.shares,
            updated_at = excluded.updated_at;

      insert into public.frase_metrics_daily (frase_id, metric_date, shares, updated_at)
      values (v_id, v_day, v_delta, timezone('utc', now()))
      on conflict (frase_id, metric_date) do update
        set shares = public.frase_metrics_daily.shares + excluded.shares,
            updated_at = excluded.updated_at;

    when 'translation_requests' then
      insert into public.frase_metrics (frase_id, translation_requests, updated_at)
      values (v_id, v_delta, timezone('utc', now()))
      on conflict (frase_id) do update
        set translation_requests = public.frase_metrics.translation_requests + excluded.translation_requests,
            updated_at = excluded.updated_at;

      insert into public.frase_metrics_daily (frase_id, metric_date, translation_requests, updated_at)
      values (v_id, v_day, v_delta, timezone('utc', now()))
      on conflict (frase_id, metric_date) do update
        set translation_requests = public.frase_metrics_daily.translation_requests + excluded.translation_requests,
            updated_at = excluded.updated_at;

    when 'search_hits' then
      insert into public.frase_metrics (frase_id, search_hits, updated_at)
      values (v_id, v_delta, timezone('utc', now()))
      on conflict (frase_id) do update
        set search_hits = public.frase_metrics.search_hits + excluded.search_hits,
            updated_at = excluded.updated_at;

      insert into public.frase_metrics_daily (frase_id, metric_date, search_hits, updated_at)
      values (v_id, v_day, v_delta, timezone('utc', now()))
      on conflict (frase_id, metric_date) do update
        set search_hits = public.frase_metrics_daily.search_hits + excluded.search_hits,
            updated_at = excluded.updated_at;

    else
      null;
  end case;
end;
$$;

grant execute on function public.mm_increment_frase_metric(text, bigint, text, text) to anon, authenticated, service_role;
