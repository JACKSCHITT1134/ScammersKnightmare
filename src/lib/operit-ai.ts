import { supabase } from './supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

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
  quota_remaining: number | typeof Infinity;
  quota_total: number | null;
  quota_used: number;
  reset_at: string | null;
}

async function invokeWithErrorHandling(functionName: string, body: any): Promise<any> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = (error as any).context?.status ?? 500;
        const textContent = await (error as any).context?.text();
        errorMessage = `[${statusCode}] ${textContent || error.message}`;
      } catch {
        errorMessage = error.message || 'Failed to read response';
      }
    }
    throw new Error(errorMessage);
  }
  return data;
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

    // All users have AI access enabled - admin can disable individually
    return {
      enabled: profile?.ai_features_enabled !== false,
      features: {
        chat: profile?.ai_chat_enabled !== false,
        analysis: profile?.ai_analysis_enabled !== false,
        quota: {
          total: profile?.ai_monthly_quota || null,
          used: profile?.ai_quota_used || 0,
          reset_at: profile?.ai_quota_reset_at,
        },
      },
    };
  },

  /**
   * Send chat message to Knight AI (powered by OnSpace AI / Gemini)
   */
  async chat(messages: AIMessage[], conversationId?: string): Promise<any> {
    return invokeWithErrorHandling('operit-ai', {
      action: 'chat',
      data: {
        messages,
        conversationId,
        model: 'google/gemini-3-flash-preview',
      },
    });
  },

  /**
   * Analyze text with Knight AI
   */
  async analyze(text: string, analysisType: 'threat' | 'sentiment' | 'general' = 'general'): Promise<string> {
    const data = await invokeWithErrorHandling('operit-ai', {
      action: 'analyze',
      data: { text, analysisType },
    });
    return data.choices[0].message.content;
  },

  /**
   * Enhance scan results with AI analysis
   */
  async enhanceScan(scanResult: any, scanType: string): Promise<string> {
    const data = await invokeWithErrorHandling('operit-ai', {
      action: 'enhance-scan',
      data: { scanResult, scanType },
    });
    return data.enhancement;
  },

  /**
   * Specialized predator/grooming pattern analysis
   */
  async analyzePredator(content: string, context?: string): Promise<string> {
    const data = await invokeWithErrorHandling('operit-ai', {
      action: 'predator-analyze',
      data: { content, context },
    });
    return data.analysis;
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
      .select('ai_monthly_quota, ai_quota_used, ai_quota_reset_at, tier')
      .eq('id', user.id)
      .single();

    const total = profile?.ai_monthly_quota;
    const used = profile?.ai_quota_used || 0;

    return {
      quota_total: total || null,
      quota_used: used,
      quota_remaining: total ? total - used : Infinity,
      reset_at: profile?.ai_quota_reset_at,
    };
  },
};
