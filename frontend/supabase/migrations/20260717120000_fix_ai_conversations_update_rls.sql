-- 20260717120000_fix_ai_conversations_update_rls.sql
-- Allow users to update their own conversation titles (needed for AssistantService)
-- The server uses the admin client for this, but add the policy as a safety net.

create policy if not exists "Users can update their own ai_conversations"
  on public.ai_conversations for update
  to authenticated
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Allow service_role to insert assistant messages (bypasses RLS automatically,
-- but this policy makes the intent explicit for audit purposes)
create policy if not exists "Service role can insert ai_messages"
  on public.ai_messages for insert
  to service_role
  with check ( true );

create policy if not exists "Service role can update ai_conversations"
  on public.ai_conversations for update
  to service_role
  using ( true )
  with check ( true );
