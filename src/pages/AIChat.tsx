import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { operitAI, AIMessage } from '@/lib/operit-ai';
import { toast } from '@/lib/toast';
import { Send, Loader2, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import knightAvatar from '@/assets/knight.webp';

export function AIChat() {
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [usage, setUsage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAccess = async () => {
    const currentUser = await auth.getCurrentUser();
    if (!currentUser) {
      navigate('/signin');
      return;
    }

    setUser(currentUser);

    try {
      const access = await operitAI.checkAccess();
      setHasAccess(access.enabled);

      if (access.enabled) {
        const convos = await operitAI.getConversations();
        setConversations(convos);

        const stats = await operitAI.getUsageStats();
        setUsage(stats);
      }
    } catch (error: any) {
      console.error('Access check failed:', error);
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await operitAI.chat([...messages, userMessage], currentConversationId);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.choices[0].message.content,
        },
      ]);

      if (response.conversationId && !currentConversationId) {
        setCurrentConversationId(response.conversationId);
        // Refresh conversations list
        const convos = await operitAI.getConversations();
        setConversations(convos);
      }

      // Update usage stats
      const stats = await operitAI.getUsageStats();
      setUsage(stats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(undefined);
  };

  const loadConversation = async (convId: string) => {
    try {
      const msgs = await operitAI.getMessages(convId);
      setMessages(msgs);
      setCurrentConversationId(convId);
    } catch (error: any) {
      toast.error('Failed to load conversation');
    }
  };

  const deleteConversation = async (convId: string) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      await operitAI.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConversationId === convId) {
        startNewChat();
      }
      toast.success('Conversation deleted');
    } catch (error: any) {
      toast.error('Failed to delete conversation');
    }
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
            AI chat and analysis features are not enabled for your account.
            Contact an administrator to request access.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src={knightAvatar} alt="Knight AI" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-primary" />
                AI Knight Assistant
              </h1>
              <p className="text-muted-foreground mt-1">
                Powered by Operit AI + Grok
              </p>
            </div>
          </div>
          {usage && (
            <div className="text-sm text-muted-foreground">
              {usage.quota_total ? (
                <span>
                  {usage.quota_remaining} / {usage.quota_total} queries remaining
                </span>
              ) : (
                <span>Unlimited queries</span>
              )}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Conversations Sidebar */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <Button onClick={startNewChat} className="w-full mb-4" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </Button>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-2">Recent Conversations</h3>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 rounded cursor-pointer hover:bg-accent/50 transition-colors group flex items-center justify-between ${
                      currentConversationId === conv.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div
                      onClick={() => loadConversation(conv.id)}
                      className="flex-1 truncate text-sm"
                    >
                      {conv.title}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConversation(conv.id)}
                      className="opacity-0 group-hover:opacity-100"
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
            <Card className="h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <img src={knightAvatar} alt="Knight" className="w-32 h-32 mx-auto mb-4 object-contain opacity-50" />
                      <p className="text-lg font-semibold mb-2">Your AI Knight Guardian</p>
                      <p className="text-muted-foreground">
                        Start a conversation about threat detection and scam analysis
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Ask anything about threat detection, scam analysis, or general assistance
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <img src={knightAvatar} alt="Knight" className="w-8 h-8 object-contain mt-1" />
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex gap-3 justify-start">
                    <img src={knightAvatar} alt="Knight" className="w-8 h-8 object-contain mt-1" />
                    <div className="bg-accent rounded-lg px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !input.trim()}>
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
