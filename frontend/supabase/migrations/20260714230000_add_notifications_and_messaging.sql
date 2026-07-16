-- Create notifications, request_messages, and notification_preferences tables
-- Step 9: Notifications, Emergency Alerts & Communication Center

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.emergency_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_type_check check (
    type in (
      'request_submitted',
      'request_accepted',
      'responder_on_the_way',
      'responder_nearby',
      'responder_arrived',
      'request_completed',
      'request_cancelled',
      'new_message',
      'assignment_received',
      'system'
    )
  )
);

-- Indexes for notifications
create index if not exists notifications_recipient_created_idx 
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx 
  on public.notifications (recipient_id, is_read, created_at desc);

create index if not exists notifications_request_idx 
  on public.notifications (request_id, created_at desc);

-- ============================================
-- REQUEST MESSAGES TABLE
-- ============================================
create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  message_type text not null default 'text',
  attachment_path text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint message_length_check check (char_length(trim(message)) between 1 and 1000),
  constraint sender_not_recipient_check check (sender_id <> recipient_id),
  constraint message_type_check check (message_type in ('text', 'image', 'location', 'system'))
);

-- Indexes for request_messages
create index if not exists request_messages_request_created_idx 
  on public.request_messages (request_id, created_at asc);

create index if not exists request_messages_recipient_unread_idx 
  on public.request_messages (recipient_id, is_read, created_at desc);

create index if not exists request_messages_sender_idx 
  on public.request_messages (sender_id, created_at desc);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  emergency_updates boolean not null default true,
  responder_arrival boolean not null default true,
  new_messages boolean not null default true,
  request_completion boolean not null default true,
  browser_notifications boolean not null default false,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Notifications RLS
alter table public.notifications enable row level security;

-- Request Messages RLS
alter table public.request_messages enable row level security;

-- Notification Preferences RLS
alter table public.notification_preferences enable row level security;

-- ============================================
-- NOTIFICATIONS RLS POLICIES
-- ============================================

-- Users can select only their own notifications
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (recipient_id = auth.uid());

-- Users can update only their own notification read state
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Users cannot insert notifications directly (use RPC functions)
create policy "Block direct notification inserts"
  on public.notifications
  for insert
  with check (false);

-- Users cannot delete notifications directly
create policy "Block direct notification deletes"
  on public.notifications
  for delete
  using (false);

-- ============================================
-- REQUEST MESSAGES RLS POLICIES
-- ============================================

-- Users can view messages for requests they participate in
create policy "Users can view their request messages"
  on public.request_messages
  for select
  using (
    exists (
      select 1 from public.emergency_requests
      where emergency_requests.id = request_messages.request_id
      and (
        emergency_requests.user_id = auth.uid() or
        emergency_requests.assigned_responder_id = auth.uid()
      )
    )
  );

-- Users can insert messages only for requests they participate in
create policy "Users can insert their request messages"
  on public.request_messages
  for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.emergency_requests
      where emergency_requests.id = request_messages.request_id
      and (
        emergency_requests.user_id = auth.uid() or
        emergency_requests.assigned_responder_id = auth.uid()
      )
    )
  );

-- Users can update only their own message read state
create policy "Users can update their message read state"
  on public.request_messages
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Users cannot delete messages
create policy "Block message deletes"
  on public.request_messages
  for delete
  using (false);

-- ============================================
-- NOTIFICATION PREFERENCES RLS POLICIES
-- ============================================

-- Users can view only their own preferences
create policy "Users can view their own preferences"
  on public.notification_preferences
  for select
  using (user_id = auth.uid());

-- Users can insert only their own preferences
create policy "Users can insert their own preferences"
  on public.notification_preferences
  for insert
  with check (user_id = auth.uid());

-- Users can update only their own preferences
create policy "Users can update their own preferences"
  on public.notification_preferences
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================
-- SECURE RPC FUNCTIONS
-- ============================================

-- Function to create a notification (security definer)
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_request_id uuid default null,
  p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_notification_id uuid;
begin
  -- Validate notification type
  if p_type not in (
    'request_submitted', 'request_accepted', 'responder_on_the_way',
    'responder_nearby', 'responder_arrived', 'request_completed',
    'request_cancelled', 'new_message', 'assignment_received', 'system'
  ) then
    raise exception 'Invalid notification type';
  end if;

  -- Insert notification
  insert into public.notifications (
    recipient_id,
    request_id,
    actor_id,
    type,
    title,
    message,
    metadata
  ) values (
    p_recipient_id,
    p_request_id,
    p_actor_id,
    p_type,
    p_title,
    p_message,
    p_metadata
  ) returning id into v_notification_id;

  return v_notification_id;
end;
$$ language plpgsql security definer;

grant execute on function public.create_notification to authenticated;

-- Function to send a request message (security definer)
create or replace function public.send_request_message(
  p_request_id uuid,
  p_message_text text
)
returns jsonb as $$
declare
  v_request record;
  v_recipient_id uuid;
  v_message_id uuid;
  v_notification_id uuid;
begin
  -- Validate message length
  if char_length(trim(p_message_text)) < 1 or char_length(trim(p_message_text)) > 1000 then
    raise exception 'Message must be between 1 and 1000 characters';
  end if;

  -- Fetch the request
  select * into v_request
  from public.emergency_requests
  where id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  -- Validate that sender is a participant (user or assigned responder)
  if v_request.user_id <> auth.uid() and v_request.assigned_responder_id <> auth.uid() then
    raise exception 'You are not authorized to send messages for this request';
  end if;

  -- Determine recipient
  if auth.uid() = v_request.user_id then
    -- Sender is the user, recipient is the responder
    if v_request.assigned_responder_id is null then
      raise exception 'Cannot send message: no responder assigned';
    end if;
    v_recipient_id := v_request.assigned_responder_id;
  else
    -- Sender is the responder, recipient is the user
    v_recipient_id := v_request.user_id;
  end if;

  -- Insert message
  insert into public.request_messages (
    request_id,
    sender_id,
    recipient_id,
    message,
    message_type
  ) values (
    p_request_id,
    auth.uid(),
    v_recipient_id,
    trim(p_message_text),
    'text'
  ) returning id into v_message_id;

  -- Create notification for recipient
  v_notification_id := public.create_notification(
    p_recipient_id := v_recipient_id,
    p_type := 'new_message',
    p_title := 'New Message',
    p_message := 'You have received a new message regarding your emergency request.',
    p_request_id := p_request_id,
    p_actor_id := auth.uid(),
    p_metadata := jsonb_build_object('message_id', v_message_id)
  );

  return jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'notification_id', v_notification_id
  );
end;
$$ language plpgsql security definer;

grant execute on function public.send_request_message to authenticated;

-- Function to mark request messages as read (security definer)
create or replace function public.mark_request_messages_read(
  p_request_id uuid
)
returns jsonb as $$
declare
  v_request record;
begin
  -- Validate that user is a participant
  select * into v_request
  from public.emergency_requests
  where id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_request.user_id <> auth.uid() and v_request.assigned_responder_id <> auth.uid() then
    raise exception 'You are not authorized to access this request';
  end if;

  -- Mark only messages addressed to current user as read
  update public.request_messages
  set 
    is_read = true,
    read_at = now()
  where request_id = p_request_id
  and recipient_id = auth.uid()
  and is_read = false;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

grant execute on function public.mark_request_messages_read to authenticated;

-- Function to mark notification as read (security definer)
create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns jsonb as $$
begin
  update public.notifications
  set 
    is_read = true,
    read_at = now()
  where id = p_notification_id
  and recipient_id = auth.uid();

  if not found then
    raise exception 'Notification not found or access denied';
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

grant execute on function public.mark_notification_read to authenticated;

-- Function to mark all notifications as read (security definer)
create or replace function public.mark_all_notifications_read()
returns jsonb as $$
begin
  update public.notifications
  set 
    is_read = true,
    read_at = now()
  where recipient_id = auth.uid()
  and is_read = false;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

grant execute on function public.mark_all_notifications_read to authenticated;

-- Function to get unread notification count (security definer)
create or replace function public.get_unread_notification_count()
returns integer as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.notifications
  where recipient_id = auth.uid()
  and is_read = false;

  return v_count;
end;
$$ language plpgsql security definer;

grant execute on function public.get_unread_notification_count to authenticated;

-- ============================================
-- TRIGGER FOR NOTIFICATION PREFERENCES UPDATED_AT
-- ============================================
create or replace function public.handle_notification_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.handle_notification_preferences_updated_at();

-- ============================================
-- ENABLE SUPABASE REALTIME
-- ============================================
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.request_messages;
