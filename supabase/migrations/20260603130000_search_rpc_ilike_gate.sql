-- Gate ILIKE fallback na busca — só termos com 3+ chars (reduz CPU no free tier)

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
      end as tsq,
      char_length(trim(coalesce(p_query, ''))) >= 3 as allow_ilike
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

comment on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[]) is
  'Busca democrática multilíngue; ILIKE só com query >= 3 chars.';

grant execute on function public.mm_search_frases_index(text, integer, integer, text, smallint, integer[]) to anon, authenticated;
