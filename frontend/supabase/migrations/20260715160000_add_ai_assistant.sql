-- 20260715160000_add_ai_assistant.sql

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  related_request_id uuid references public.emergency_requests(id) on delete set null,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system_summary')),
  content text not null,
  provider text,
  model text,
  intent text,
  urgency text,
  safety_category text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text,
  request_characters integer not null,
  response_characters integer,
  status text not null,
  latency_ms integer,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;

-- Conversations policies
create policy "Users can view their own ai_conversations"
  on public.ai_conversations for select
  to authenticated
  using ( auth.uid() = user_id );

create policy "Users can insert their own ai_conversations"
  on public.ai_conversations for insert
  to authenticated
  with check ( auth.uid() = user_id );

create policy "Users can delete their own ai_conversations"
  on public.ai_conversations for delete
  to authenticated
  using ( auth.uid() = user_id );

-- Messages policies
create policy "Users can view their own ai_messages"
  on public.ai_messages for select
  to authenticated
  using ( auth.uid() = user_id );

create policy "Users can insert user ai_messages"
  on public.ai_messages for insert
  to authenticated
  with check ( 
    auth.uid() = user_id 
    and role = 'user' 
    and provider is null 
    and intent is null 
    and urgency is null 
    and safety_category is null 
  );

-- Usage policies
create policy "Users can view their own ai_usage"
  on public.ai_usage for select
  to authenticated
  using ( auth.uid() = user_id );

-- Trigger
create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row
  execute function public.handle_updated_at();
