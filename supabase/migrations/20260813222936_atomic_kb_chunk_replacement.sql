create or replace function public.replace_kb_chunks(
  p_doc_ids text[],
  p_chunks jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  inserted_count integer;
  supplied_count integer;
begin
  if p_doc_ids is null then
    raise exception 'p_doc_ids must not be null';
  end if;

  if p_chunks is null or pg_catalog.jsonb_typeof(p_chunks) <> 'array' then
    raise exception 'p_chunks must be a JSON array';
  end if;

  delete from public.kb_chunks
  where doc_id = any(p_doc_ids);

  insert into public.kb_chunks (
    doc_id,
    chunk_index,
    title,
    content,
    level,
    source_page,
    token_estimate,
    embedding
  )
  select
    chunk.doc_id,
    chunk.chunk_index,
    chunk.title,
    chunk.content,
    chunk.level,
    chunk.source_page,
    chunk.token_estimate,
    chunk.embedding::extensions.vector
  from pg_catalog.jsonb_to_recordset(p_chunks) as chunk(
    doc_id text,
    chunk_index integer,
    title text,
    content text,
    level smallint,
    source_page integer,
    token_estimate integer,
    embedding text
  )
  where chunk.doc_id = any(p_doc_ids);

  get diagnostics inserted_count = row_count;
  supplied_count := pg_catalog.jsonb_array_length(p_chunks);

  if inserted_count <> supplied_count then
    raise exception 'every supplied chunk must belong to p_doc_ids';
  end if;

  return inserted_count;
end;
$function$;

revoke execute on function public.replace_kb_chunks(text[], jsonb) from public, anon, authenticated;
grant execute on function public.replace_kb_chunks(text[], jsonb) to service_role;
