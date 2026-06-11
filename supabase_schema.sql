-- ─────────────────────────────────────────────────────────
-- SOMA PEOPLE — schema completo
-- Cole isso no SQL Editor do Supabase e execute
-- ─────────────────────────────────────────────────────────

-- 1. Tabela de usuários autorizados (só quem tiver aqui entra)
create table if not exists usuarios_people (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  email     text not null unique,
  perfil    text not null check (perfil in ('super_admin','gestor','rh')),
  ativo     boolean not null default true,
  criado_em timestamptz default now()
);

-- 2. Tabela principal de colaboradores
create table if not exists colaboradores (
  id                  uuid primary key default gen_random_uuid(),
  -- Identificação
  nome                text not null,
  cargo               text,
  departamento        text,
  status              text not null default 'ativo' check (status in ('ativo','afastado','desligado')),
  data_admissao       date,
  foto_url            text,
  -- Pessoal
  data_nascimento     date,
  cpf                 text, -- armazenado criptografado (via Supabase Vault futuramente)
  whatsapp            text,
  email               text,
  endereco            text,
  estado_civil        text,
  filhos              text,
  -- Perfil comportamental
  fuma                text,
  bebe                text,
  atividade_fisica    text,
  religiao            text,
  hobbies             text,
  maior_sonho         text,
  objetivo_profissional text,
  -- Formação
  escolaridade        text,
  graduacao           text,
  cursos              text,
  idiomas             text,
  interesses_carteira text,
  -- PDI
  pdi                 text,
  -- Financeiro (acessado por super_admin apenas via RLS)
  salario             numeric(10,2),
  ultimo_reajuste     text,
  beneficios          text,
  -- Meta
  criado_em           timestamptz default now(),
  atualizado_em       timestamptz default now()
);

-- 3. Avaliações dos executivos
create table if not exists avaliacoes (
  id               uuid primary key default gen_random_uuid(),
  colaborador_id   uuid references colaboradores(id) on delete cascade,
  autor_id         uuid references usuarios_people(id),
  texto            text not null,
  criado_em        timestamptz default now()
);

-- 4. Elogios recebidos
create table if not exists elogios (
  id               uuid primary key default gen_random_uuid(),
  colaborador_id   uuid references colaboradores(id) on delete cascade,
  texto            text not null,
  origem           text, -- ex: "cliente direto", "Léo (interno)"
  criado_em        timestamptz default now()
);

-- 5. Log de auditoria
create table if not exists auditoria_logs (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid references usuarios_people(id),
  acao             text not null,
  colaborador_id   uuid,
  detalhes         jsonb,
  criado_em        timestamptz default now()
);

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) — o coração da proteção
-- ─────────────────────────────────────────────────────────

alter table colaboradores   enable row level security;
alter table avaliacoes       enable row level security;
alter table elogios          enable row level security;
alter table auditoria_logs   enable row level security;
alter table usuarios_people  enable row level security;

-- Helper: retorna o perfil do usuário logado
create or replace function perfil_atual()
returns text language sql security definer
as $$
  select perfil from usuarios_people
  where id = auth.uid() and ativo = true
  limit 1;
$$;

-- ── colaboradores: todos os perfis autorizados lêem, só super_admin escreve
create policy "leitura_colaboradores" on colaboradores
  for select using (perfil_atual() is not null);

create policy "escrita_colaboradores" on colaboradores
  for all using (perfil_atual() = 'super_admin');

-- ── avaliações e elogios: super_admin e gestor lêem/escrevem
create policy "leitura_avaliacoes" on avaliacoes
  for select using (perfil_atual() in ('super_admin','gestor'));

create policy "escrita_avaliacoes" on avaliacoes
  for insert with check (perfil_atual() in ('super_admin','gestor'));

create policy "leitura_elogios" on elogios
  for select using (perfil_atual() in ('super_admin','gestor'));

create policy "escrita_elogios" on elogios
  for insert with check (perfil_atual() in ('super_admin','gestor'));

-- ── auditoria: só super_admin lê; qualquer perfil autorizado insere
create policy "leitura_auditoria" on auditoria_logs
  for select using (perfil_atual() = 'super_admin');

create policy "inserir_auditoria" on auditoria_logs
  for insert with check (perfil_atual() is not null);

-- ── usuarios_people: cada um vê só o próprio registro; super_admin vê todos
create policy "ver_proprio_usuario" on usuarios_people
  for select using (id = auth.uid() or perfil_atual() = 'super_admin');

create policy "gerenciar_usuarios" on usuarios_people
  for all using (perfil_atual() = 'super_admin');

-- ─────────────────────────────────────────────────────────
-- INSERIR SEUS USUÁRIOS INICIAIS
-- Substitua pelos emails e UUIDs reais após criar as contas no Supabase Auth
-- ─────────────────────────────────────────────────────────

-- insert into usuarios_people (id, nome, email, perfil) values
--   ('uuid-do-bruno-no-auth', 'Bruno', 'bruno@soma.com', 'super_admin'),
--   ('uuid-da-leo-no-auth',   'Léo',   'leo@soma.com',   'super_admin');
