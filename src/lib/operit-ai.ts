import { supabase } from './supabase';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AIUsage {
  quota_remaining: number;
  quota_total: number | null;
  quota_used: number;
  reset_at: string | null;
}

export const operitAI = {
  /**
   * Check if user has AI features enabled
   */
  async checkAccess(): Promise<{ enabled: boolean; features: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ai_features_enabled, ai_chat_enabled, ai_analysis_enabled, ai_monthly_quota, ai_quota_used, ai_quota_reset_at')
      .eq('id', user.id)
      .single();

    return {
      enabled: profile?.ai_features_enabled || false,
      features: {
        chat: profile?.ai_chat_enabled || false,
        analysis: profile?.ai_analysis_enabled || false,
        quota: {
          total: profile?.ai_monthly_quota,
          used: profile?.ai_quota_used || 0,
          reset_at: profile?.ai_quota_reset_at,
        },
      },
    };
  },

  /**
   * Send chat message to AI
   */
  async chat(messages: AIMessage[], conversationId?: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'chat',
        data: {
          messages,
          conversationId,
          model: 'grok-beta',
        },
      },
    });

    if (error) {
      if (error instanceof Error && 'context' in error) {
        const httpError = error as any;
        const errorText = await httpError.context?.text();
        throw new Error(errorText || error.message);
      }
      throw error;
    }

    return data;
  },

  /**
   * Analyze text with AI
   */
  async analyze(text: string, analysisType: 'threat' | 'sentiment' | 'general' = 'general'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'analyze',
        data: {
          text,
          analysisType,
        },
      },
    });

    if (error) {
      if (error instanceof Error && 'context' in error) {
        const httpError = error as any;
        const errorText = await httpError.context?.text();
        throw new Error(errorText || error.message);
      }
      throw error;
    }

    return data.choices[0].message.content;
  },

  /**
   * Enhance scan results with AI analysis
   */
  async enhanceScan(scanResult: any, scanType: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('operit-ai', {
      body: {
        action: 'enhance-scan',
        data: {
          scanResult,
          scanType,
        },
      },
    });

    if (error) {
      if (error instanceof Error && 'context' in error) {
        const httpError = error as any;
        const errorText = await httpError.context?.text();
        throw new Error(errorText || error.message);
      }
      throw error;
    }

    return data.enhancement;
  },

  /**
   * Get user's conversations
   */
  async getConversations(): Promise<AIConversation[]> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  },

  /**
   * Get user's AI usage statistics
   */
  async getUsageStats(): Promise<AIUsage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ai_monthly_quota, ai_quota_used, ai_quota_reset_at')
      .eq('id', user.id)
      .single();

    const total = profile?.ai_monthly_quota;
    const used = profile?.ai_quota_used || 0;

    return {
      quota_total: total,
      quota_used: used,
      quota_remaining: total ? total - used : Infinity,
      reset_at: profile?.ai_quota_reset_at,
    };
  },
};
