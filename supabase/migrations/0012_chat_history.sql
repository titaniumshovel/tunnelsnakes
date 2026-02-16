-- Chat history tables for Ask Smalls

CREATE TABLE chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM chat_conversations WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM chat_conversations WHERE user_id = auth.uid())
  );

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
