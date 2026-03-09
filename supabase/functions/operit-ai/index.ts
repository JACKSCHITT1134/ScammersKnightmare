import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const OPERIT_API_KEY = Deno.env.get('OPERIT_API_KEY');
const OPERIT_API_URL = 'https://api.operit.ai/v1'; // Default endpoint, adjust as needed

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's AI permissions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('ai_features_enabled, ai_chat_enabled, ai_analysis_enabled, ai_monthly_quota, ai_quota_used')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.ai_features_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI features not enabled for this user. Contact admin for access.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();

    // Check quota before processing
    const { data: quotaCheck } = await supabase.rpc('check_ai_quota', { user_uuid: user.id });
    if (!quotaCheck) {
      return new Response(
        JSON.stringify({ error: 'Monthly AI quota exceeded. Please upgrade your plan or wait for next month.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'chat': {
        if (!profile.ai_chat_enabled) {
          return new Response(
            JSON.stringify({ error: 'AI chat not enabled for this user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { messages, conversationId, model = 'grok-beta' } = data;

        // Call Operit AI API
        const response = await fetch(`${OPERIT_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPERIT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Operit AI Error:', errorText);
          return new Response(
            JSON.stringify({ error: `Operit AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        // Save conversation and messages
        let convId = conversationId;
        if (!convId) {
          const { data: newConv } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: user.id,
              model,
              title: messages[0]?.content?.substring(0, 100) || 'New Chat',
            })
            .select()
            .single();
          convId = newConv?.id;
        }

        // Save messages
        const messagesToSave = [
          { conversation_id: convId, role: 'user', content: messages[messages.length - 1].content },
          { conversation_id: convId, role: 'assistant', content: result.choices[0].message.content },
        ];

        await supabase.from('ai_messages').insert(messagesToSave);

        // Log usage
        const tokens = result.usage?.total_tokens || 1000;
        await supabase.from('ai_usage_log').insert({
          user_id: user.id,
          conversation_id: convId,
          model,
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: tokens,
          feature_type: 'chat',
        });

        // Increment quota
        await supabase.rpc('increment_ai_usage', { user_uuid: user.id, tokens: 1 });

        return new Response(
          JSON.stringify({ ...result, conversationId: convId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'analyze': {
        if (!profile.ai_analysis_enabled) {
          return new Response(
            JSON.stringify({ error: 'AI analysis not enabled for this user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { text, analysisType = 'general' } = data;

        const systemPrompt = {
          threat: 'You are a threat analysis AI. Analyze the provided content for potential scams, phishing, fraud, or malicious intent. Provide a detailed threat assessment.',
          sentiment: 'You are a sentiment analysis AI. Analyze the emotional tone and intent of the provided content.',
          general: 'You are a helpful AI assistant. Analyze and provide insights about the provided content.',
        }[analysisType] || 'Analyze the following content:';

        const response = await fetch(`${OPERIT_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPERIT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text },
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `Operit AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        // Log usage
        await supabase.from('ai_usage_log').insert({
          user_id: user.id,
          model: 'grok-beta',
          total_tokens: result.usage?.total_tokens || 500,
          feature_type: 'analysis',
        });

        await supabase.rpc('increment_ai_usage', { user_uuid: user.id, tokens: 1 });

        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enhance-scan': {
        // AI-enhanced threat detection
        const { scanResult, scanType } = data;

        const response = await fetch(`${OPERIT_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPERIT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              {
                role: 'system',
                content: 'You are an expert threat analyst. Review the scan results and provide additional insights, context, and recommendations.',
              },
              {
                role: 'user',
                content: `Scan Type: ${scanType}\n\nResults:\n${JSON.stringify(scanResult, null, 2)}\n\nProvide enhanced analysis and actionable recommendations.`,
              },
            ],
            temperature: 0.4,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `Operit AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        await supabase.from('ai_usage_log').insert({
          user_id: user.id,
          model: 'grok-beta',
          total_tokens: result.usage?.total_tokens || 800,
          feature_type: 'threat_detection',
        });

        await supabase.rpc('increment_ai_usage', { user_uuid: user.id, tokens: 1 });

        return new Response(
          JSON.stringify({
            enhancement: result.choices[0].message.content,
            model: 'grok-beta',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Operit AI Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
