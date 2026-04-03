// ===== Configuration Supabase =====
//
// ÉTAPES :
// 1. Allez sur https://app.supabase.com → votre projet → Settings → API
// 2. Copiez "Project URL" et "anon / public key" ci-dessous
//
// 3. Dans le menu gauche → "SQL Editor" → "New query", collez et exécutez :
//
//    create table if not exists gardens (
//      id text primary key,
//      created_at timestamptz default now()
//    );
//
//    create table if not exists garden_docs (
//      id bigserial primary key,
//      garden_id text not null references gardens(id) on delete cascade,
//      store text not null,
//      doc_id text not null,
//      plant_id bigint,
//      data jsonb not null default '{}',
//      updated_at timestamptz default now(),
//      unique(garden_id, store, doc_id)
//    );
//
//    create index if not exists idx_garden_docs
//      on garden_docs(garden_id, store, plant_id);
//
//    alter table gardens enable row level security;
//    alter table garden_docs enable row level security;
//
//    create policy "open" on gardens    for all to anon using (true) with check (true);
//    create policy "open" on garden_docs for all to anon using (true) with check (true);
//
// 4. Remplissez les deux valeurs ci-dessous et sauvegardez.

const SUPABASE_URL  = 'https://wcwmavxphndgcxgrxazz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjd21hdnhwaG5kZ2N4Z3J4YXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTEwNDMsImV4cCI6MjA5MDc4NzA0M30.F69hg-dwQh8skpybU-6JOpOP-bOcChPQFmnmBPFAa_s';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON);
