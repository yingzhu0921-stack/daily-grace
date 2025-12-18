drop extension if exists "pg_net";

drop trigger if exists "update_categories_updated_at" on "public"."categories";

drop trigger if exists "update_custom_records_updated_at" on "public"."custom_records";

drop trigger if exists "update_meditation_notes_updated_at" on "public"."meditation_notes";

drop trigger if exists "update_prayer_notes_updated_at" on "public"."prayer_notes";

drop trigger if exists "update_verse_cards_updated_at" on "public"."verse_cards";

drop policy "Users can delete their own categories" on "public"."categories";

drop policy "Users can insert their own categories" on "public"."categories";

drop policy "Users can update their own categories" on "public"."categories";

drop policy "Users can view their own categories" on "public"."categories";

drop policy "Users can delete their own diary entries" on "public"."diary_entries";

drop policy "Users can insert their own diary entries" on "public"."diary_entries";

drop policy "Users can update their own diary entries" on "public"."diary_entries";

drop policy "Users can view their own diary entries" on "public"."diary_entries";

drop policy "Users can delete their own gratitude entries" on "public"."gratitude_entries";

drop policy "Users can insert their own gratitude entries" on "public"."gratitude_entries";

drop policy "Users can update their own gratitude entries" on "public"."gratitude_entries";

drop policy "Users can view their own gratitude entries" on "public"."gratitude_entries";

drop policy "Users can delete their own meditation notes" on "public"."meditation_notes";

drop policy "Users can insert their own meditation notes" on "public"."meditation_notes";

drop policy "Users can update their own meditation notes" on "public"."meditation_notes";

drop policy "Users can view their own meditation notes" on "public"."meditation_notes";

drop policy "Users can delete their own prayer notes" on "public"."prayer_notes";

drop policy "Users can insert their own prayer notes" on "public"."prayer_notes";

drop policy "Users can update their own prayer notes" on "public"."prayer_notes";

drop policy "Users can view their own prayer notes" on "public"."prayer_notes";

drop policy "Users can insert their own profile" on "public"."profiles";

drop policy "Users can update their own profile" on "public"."profiles";

drop policy "Users can view their own profile" on "public"."profiles";

drop policy "Users can create their own verse cards" on "public"."verse_cards";

drop policy "Users can delete their own verse cards" on "public"."verse_cards";

drop policy "Users can update their own verse cards" on "public"."verse_cards";

drop policy "Users can view their own verse cards" on "public"."verse_cards";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."verse_cards" from "anon";

revoke insert on table "public"."verse_cards" from "anon";

revoke references on table "public"."verse_cards" from "anon";

revoke select on table "public"."verse_cards" from "anon";

revoke trigger on table "public"."verse_cards" from "anon";

revoke truncate on table "public"."verse_cards" from "anon";

revoke update on table "public"."verse_cards" from "anon";

revoke delete on table "public"."verse_cards" from "authenticated";

revoke insert on table "public"."verse_cards" from "authenticated";

revoke references on table "public"."verse_cards" from "authenticated";

revoke select on table "public"."verse_cards" from "authenticated";

revoke trigger on table "public"."verse_cards" from "authenticated";

revoke truncate on table "public"."verse_cards" from "authenticated";

revoke update on table "public"."verse_cards" from "authenticated";

revoke delete on table "public"."verse_cards" from "service_role";

revoke insert on table "public"."verse_cards" from "service_role";

revoke references on table "public"."verse_cards" from "service_role";

revoke select on table "public"."verse_cards" from "service_role";

revoke trigger on table "public"."verse_cards" from "service_role";

revoke truncate on table "public"."verse_cards" from "service_role";

revoke update on table "public"."verse_cards" from "service_role";

alter table "public"."profiles" drop constraint "profiles_id_fkey";

alter table "public"."diary_entries" drop constraint "diary_entries_user_id_fkey";

alter table "public"."gratitude_entries" drop constraint "gratitude_entries_user_id_fkey";

alter table "public"."meditation_notes" drop constraint "meditation_notes_user_id_fkey";

alter table "public"."prayer_notes" drop constraint "prayer_notes_user_id_fkey";

drop function if exists "public"."handle_new_user"();

drop function if exists "public"."update_updated_at_column"();

alter table "public"."profiles" drop constraint "profiles_pkey";

alter table "public"."verse_cards" drop constraint "verse_cards_pkey";

drop index if exists "public"."idx_categories_user_id";

drop index if exists "public"."idx_diary_entries_date";

drop index if exists "public"."idx_gratitude_entries_date";

drop index if exists "public"."idx_meditation_notes_date";

drop index if exists "public"."profiles_pkey";

drop index if exists "public"."verse_cards_pkey";

drop index if exists "public"."categories_pkey";

drop index if exists "public"."idx_custom_records_category_id";

drop table "public"."profiles";

drop table "public"."verse_cards";

alter table "public"."categories" drop column "icon";

alter table "public"."categories" alter column "created_at" drop not null;

alter table "public"."categories" alter column "fields" drop not null;

alter table "public"."categories" alter column "id" set default (gen_random_uuid())::text;

alter table "public"."categories" alter column "id" set data type text using "id"::text;

alter table "public"."categories" alter column "updated_at" drop not null;

alter table "public"."categories" alter column "user_id" drop not null;

alter table "public"."custom_records" alter column "category_id" set data type text using "category_id"::text;

alter table "public"."diary_entries" drop column "date";

alter table "public"."diary_entries" add column "updated_at" timestamp with time zone default now();

alter table "public"."diary_entries" alter column "created_at" drop not null;

alter table "public"."diary_entries" alter column "user_id" drop not null;

alter table "public"."gratitude_entries" drop column "date";

alter table "public"."gratitude_entries" drop column "items";

alter table "public"."gratitude_entries" add column "content" text not null;

alter table "public"."gratitude_entries" add column "updated_at" timestamp with time zone default now();

alter table "public"."gratitude_entries" alter column "created_at" drop not null;

alter table "public"."gratitude_entries" alter column "user_id" drop not null;

alter table "public"."meditation_notes" drop column "apply_checked_at";

alter table "public"."meditation_notes" drop column "date";

alter table "public"."meditation_notes" drop column "full_text";

alter table "public"."meditation_notes" alter column "created_at" drop not null;

alter table "public"."meditation_notes" alter column "title" drop not null;

alter table "public"."meditation_notes" alter column "updated_at" drop not null;

alter table "public"."meditation_notes" alter column "user_id" drop not null;

alter table "public"."prayer_notes" alter column "created_at" drop not null;

alter table "public"."prayer_notes" alter column "date" set default to_char(now(), 'YYYY-MM-DD'::text);

alter table "public"."prayer_notes" alter column "title" drop not null;

alter table "public"."prayer_notes" alter column "updated_at" drop not null;

alter table "public"."prayer_notes" alter column "user_id" drop not null;

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE INDEX idx_custom_records_category_id ON public.custom_records USING btree (category_id);

alter table "public"."diary_entries" add constraint "diary_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."diary_entries" validate constraint "diary_entries_user_id_fkey";

alter table "public"."gratitude_entries" add constraint "gratitude_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."gratitude_entries" validate constraint "gratitude_entries_user_id_fkey";

alter table "public"."meditation_notes" add constraint "meditation_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."meditation_notes" validate constraint "meditation_notes_user_id_fkey";

alter table "public"."prayer_notes" add constraint "prayer_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."prayer_notes" validate constraint "prayer_notes_user_id_fkey";


  create policy "Users can delete own categories"
  on "public"."categories"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own categories"
  on "public"."categories"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own categories"
  on "public"."categories"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own categories"
  on "public"."categories"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own diary entries"
  on "public"."diary_entries"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own diary entries"
  on "public"."diary_entries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own diary entries"
  on "public"."diary_entries"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own diary entries"
  on "public"."diary_entries"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own gratitude entries"
  on "public"."gratitude_entries"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own gratitude entries"
  on "public"."gratitude_entries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own gratitude entries"
  on "public"."gratitude_entries"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own gratitude entries"
  on "public"."gratitude_entries"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own meditation notes"
  on "public"."meditation_notes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own meditation notes"
  on "public"."meditation_notes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own meditation notes"
  on "public"."meditation_notes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own meditation notes"
  on "public"."meditation_notes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own prayer notes"
  on "public"."prayer_notes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert own prayer notes"
  on "public"."prayer_notes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own prayer notes"
  on "public"."prayer_notes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own prayer notes"
  on "public"."prayer_notes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


drop trigger if exists "on_auth_user_created" on "auth"."users";


