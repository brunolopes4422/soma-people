-- ─────────────────────────────────────────────────────────
-- SOMA PEOPLE — Módulo Talent Pool
-- Cole no SQL Editor do Supabase e execute
-- ─────────────────────────────────────────────────────────

-- Adicionar campo que faltava na tabela colaboradores
alter table if exists colaboradores
  add column if not exists perfil_comportamental text;

create table if not exists candidates (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  email           text not null,
  telefone        text,
  curriculo_url   text,
  curriculo_texto text,         -- texto extraído do PDF
  respostas_json  jsonb,        -- respostas das 5 perguntas
  nivel           text check (nivel in ('iniciante','medio','avancado')),
  skills_json     jsonb,        -- { comunicacao, organizacao, lideranca, tecnico, proatividade }
  score_geral     integer,
  analise_json    jsonb,        -- resumo completo da IA
  status          text not null default 'novo' check (status in ('novo','analisado','aprovado','rejeitado')),
  notas_admin     text,
  created_at      timestamptz default now()
);

-- Storage bucket para currículos (execute no dashboard Storage também)
-- insert into storage.buckets (id, name, public) values ('curriculos', 'curriculos', false);

-- RLS: candidatos NÃO acessam — somente admins
alter table candidates enable row level security;

create policy "admins_leem_candidates" on candidates
  for select using (perfil_atual() in ('super_admin','gestor'));

create policy "admins_escrevem_candidates" on candidates
  for all using (perfil_atual() in ('super_admin','gestor'));

-- Inserção pública (formulário /trabalhe-conosco) — sem autenticação
create policy "publico_insere_candidate" on candidates
  for insert with check (true);

-- Configurações do módulo (pesos das skills, nota mínima, etc.)
create table if not exists talent_config (
  id                    integer primary key default 1,
  peso_comunicacao      float default 1.0,
  peso_organizacao      float default 1.0,
  peso_lideranca        float default 0.7,
  peso_tecnico          float default 1.0,
  peso_proatividade     float default 0.9,
  score_minimo          integer default 50,
  analise_automatica    boolean default true,
  updated_at            timestamptz default now()
);

insert into talent_config (id) values (1) on conflict do nothing;

alter table talent_config enable row level security;

create policy "admins_config" on talent_config
  for all using (perfil_atual() = 'super_admin');
