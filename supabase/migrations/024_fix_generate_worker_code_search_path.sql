-- =====================================================================
-- Migration 024: Fix generate_worker_code() unqualified sequence ref
-- Created: 2026-04-22
--
-- Bug: generate_worker_code() has `search_path = ''` (locked down for
-- security per Supabase linter advice), but references
-- `nextval('worker_code_seq')` without schema qualifier. With empty
-- search_path, the sequence lookup fails and every auth.users INSERT
-- aborts with "Database error saving new user" — breaking signup entirely.
--
-- Fix: qualify the sequence as `public.worker_code_seq`.
--
-- Impact: any app on this DB that does signup (ops, field, inspect,
--         monitor, etc.) — they all depend on the auth.users trigger.
-- =====================================================================

create or replace function public.generate_worker_code()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.worker_code is null then
    new.worker_code := 'OSC-' || lpad(nextval('public.worker_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$function$;
