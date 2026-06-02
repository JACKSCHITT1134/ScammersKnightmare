import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Send, Loader2, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import knightAvatar from '@/assets/knight.webp';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChat() {
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const checkAccess = async () => {
    const currentUser = await auth.getCurrentUser();
    if (!currentUser) {
      navigate('/signin');
      return;
    }
    setUser(currentUser);

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ai_features_enabled, ai_chat_enabled, ai_monthly_quota, ai_quota_used')
        .eq('id', currentUser.id)
        .single();

      setHasAccess(profile?.ai_features_enabled ?? false);

      if (profile?.ai_features_enabled) {
        await loadConversations();
      }
    } catch (error: any) {
      console.error('Access check failed:', error);
      setHasAccess(true); // Default to enabled if check fails
    }

    setLoading(false);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, model, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setConversations(data);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: AIMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStreamingContent('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      setSending(false);
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/operit-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'chat',
            streaming: true,
            data: {
              messages: [...messages, userMessage],
              conversationId: currentConversationId,
              model: 'google/gemini-3-flash-preview',
            },
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) throw new Error('No response stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                setStreamingContent(fullContent);
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      // Finalize: move streaming content to messages
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullContent || 'No response received.' },
      ]);
      setStreamingContent('');

      // Save conversation to DB
      if (!currentConversationId) {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            model: 'google/gemini-3-flash-preview',
            title: userMessage.content.substring(0, 100),
          })
          .select()
          .single();
        if (newConv) {
          setCurrentConversationId(newConv.id);
          await loadConversations();
        }
      }

      if (currentConversationId) {
        await supabase.from('ai_messages').insert([
          { conversation_id: currentConversationId, role: 'user', content: userMessage.content },
          { conversation_id: currentConversationId, role: 'assistant', content: fullContent },
        ]);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (streamingContent) {
          setMessages((prev) => [...prev, { role: 'assistant', content: streamingContent + ' [stopped]' }]);
        }
        setStreamingContent('');
      } else {
        console.error('Chat error:', error);
        toast.error(error.message || 'Failed to send message');
        setMessages((prev) => prev.slice(0, -1));
        setStreamingContent('');
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setStreamingContent('');
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data: msgs } = await supabase
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (msgs) {
        setMessages(msgs as AIMessage[]);
        setCurrentConversationId(convId);
        setStreamingContent('');
      }
    } catch {
      toast.error('Failed to load conversation');
    }
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    await supabase.from('ai_conversations').delete().eq('id', convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConversationId === convId) startNewChat();
    toast.success('Conversation deleted');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen pt-20 px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <img src={knightAvatar} alt="Knight" className="w-24 h-24 mx-auto mb-4 object-contain opacity-50" />
          <h1 className="text-2xl font-bold mb-4">AI Features Not Enabled</h1>
          <p className="text-muted-foreground mb-6">
            AI chat features are not enabled for your account. Contact an administrator to request access.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={knightAvatar} alt="Knight AI" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-primary" />
                Knight AI Assistant
              </h1>
              <p className="text-muted-foreground text-sm">Powered by Gemini 3 Flash • Real-time streaming</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <Button onClick={startNewChat} className="w-full mb-4" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </Button>
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  Recent Chats
                </h3>
                {conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No conversations yet</p>
                )}
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent/50 transition-colors ${
                      currentConversationId === conv.id ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="flex-1 truncate text-sm">{conv.title || 'Untitled'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-3">
            <Card className="h-[650px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && !streamingContent ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <img src={knightAvatar} alt="Knight" className="w-28 h-28 mx-auto mb-4 object-contain opacity-40" />
                      <p className="text-lg font-semibold mb-2">Your AI Knight Guardian</p>
                      <p className="text-muted-foreground text-sm max-w-xs">
                        Ask about scams, phishing, predator detection, dark web monitoring, or any security concern.
                      </p>
                      <div className="grid grid-cols-1 gap-2 mt-4 text-left">
                        {[
                          'Is this email a phishing attempt?',
                          'How do online predators target victims?',
                          'What are signs of a romance scam?',
                          'How do I protect my elderly parents from scams?',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="text-sm px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <img src={knightAvatar} alt="Knight" className="w-8 h-8 object-contain mt-1 flex-shrink-0" />
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-accent text-foreground rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Streaming indicator */}
                    {(streamingContent || sending) && (
                      <div className="flex gap-3 justify-start">
                        <img src={knightAvatar} alt="Knight" className="w-8 h-8 object-contain mt-1 flex-shrink-0" />
                        <div className="max-w-[80%] bg-accent rounded-2xl rounded-bl-sm px-4 py-3">
                          {streamingContent ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {streamingContent}
                              <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                            </p>
                          ) : (
                            <div className="flex gap-1 items-center h-5">
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Knight AI anything about scams, threats, or security..."
                    disabled={sending}
                    className="flex-1"
                  />
                  {sending ? (
                    <Button type="button" variant="destructive" onClick={stopStreaming} className="flex-shrink-0">
                      ⏹ Stop
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!input.trim()} className="flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Powered by Knight AI (Gemini 3 Flash) • Responses stream in real-time
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
