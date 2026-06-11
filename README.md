# Soma People

Sistema interno de gestão de colaboradores. Acesso restrito.

## Stack

- React + Vite
- Supabase (Auth + Database + RLS)
- Vercel (deploy)

---

## Setup passo a passo

### 1. Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e cole o conteúdo de `supabase_schema.sql` e execute
3. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public key`

### 2. Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Criar os primeiros usuários (Bruno e Léo)

No Supabase, vá em **Authentication → Users → Invite user** e crie os dois usuários.

Após criados, pegue o UUID de cada um em Authentication → Users e rode no SQL Editor:

```sql
insert into usuarios_people (id, nome, email, perfil) values
  ('uuid-do-bruno', 'Bruno', 'bruno@soma.com', 'super_admin'),
  ('uuid-da-leo',   'Léo',   'leo@soma.com',   'super_admin');
```

### 4. Rodar localmente

```bash
npm install
npm run dev
```

### 5. Deploy na Vercel

1. Faça push do projeto para um repositório privado no GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → importe o repo
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Deploy

---

## Estrutura do projeto

```
src/
  components/
    auth/         RotaProtegida.jsx
    layout/       AppLayout.jsx
  hooks/          useAuth.jsx
  lib/            supabase.js, permissoes.js
  pages/
    Login.jsx
    ListaColaboradores.jsx
    FichaColaborador.jsx
    FormColaborador.jsx
    Auditoria.jsx
    Usuarios.jsx
  styles/         global.css
```

## Perfis de acesso

| Perfil       | Quem        | O que pode ver                          |
|--------------|-------------|------------------------------------------|
| super_admin  | Bruno, Léo  | Tudo, incluindo financeiro e auditoria   |
| gestor       | Leandro, Xai| Fichas completas, sem financeiro         |
| rh           | Futuro      | Apenas perfil comportamental             |

---

## Segurança

- Login com email + senha via Supabase Auth
- MFA disponível no painel do Supabase (ativar em Authentication → Settings)
- Row Level Security (RLS) no banco: cada perfil só acessa o que pode
- Sessão JWT com expiração de 8h
- Bloqueio após 5 tentativas erradas (client-side + Supabase Auth nativo)
- Log de auditoria em cada acesso a ficha
- Sistema completamente separado do portal Soma principal
