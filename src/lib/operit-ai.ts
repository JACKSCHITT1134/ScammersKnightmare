import { supabase } from './supabase';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

class OperitAI {
  async checkAccess(): Promise<{ enabled: boolean; features: { chat: boolean; analysis: boolean } }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { enabled: false, features: { chat: false, analysis: false } };

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ai_features_enabled, ai_chat_enabled, ai_analysis_enabled')
        .eq('id', session.user.id)
        .single();

      return {
        enabled: profile?.ai_features_enabled ?? false,
        features: {
          chat: profile?.ai_chat_enabled ?? false,
          analysis: profile?.ai_analysis_enabled ?? false,
        },
      };
    } catch {
      return { enabled: true, features: { chat: true, analysis: true } };
    }
  }

  async chat(messages: AIMessage[], conversationId?: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'chat',
        streaming: false,
        data: { messages, conversationId, model: 'google/gemini-3-flash-preview' },
      },
    });

    if (error) {
      let msg = error.message;
      try {
        const txt = await (error as any).context?.text?.();
        if (txt) msg = txt;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return data;
  }

  async enhanceScan(scanDetails: any, scanType: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'enhance-scan',
        data: { scanResult: scanDetails, scanType },
      },
    });

    if (error) {
      let msg = error.message;
      try {
        const txt = await (error as any).context?.text?.();
        if (txt) msg = txt;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    return data?.enhancement || 'No AI enhancement available.';
  }

  async analyze(text: string, analysisType = 'threat'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'analyze',
        data: { text, analysisType },
      },
    });

    if (error) throw new Error(error.message);
    return data?.choices?.[0]?.message?.content || '';
  }

  async getConversations(): Promise<any[]> {
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, model, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    return data || [];
  }

  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return (data || []) as AIMessage[];
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await supabase.from('ai_conversations').delete().eq('id', conversationId);
  }

  async getUsageStats(): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ai_monthly_quota, ai_quota_used, tier')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      quota_used: profile.ai_quota_used || 0,
      quota_total: profile.ai_monthly_quota,
      quota_remaining: profile.ai_monthly_quota
        ? Math.max(0, profile.ai_monthly_quota - (profile.ai_quota_used || 0))
        : null,
      tier: profile.tier,
    };
  }
}

export const operitAI = new OperitAI();
