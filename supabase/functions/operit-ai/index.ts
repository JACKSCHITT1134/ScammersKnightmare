/**
 * OnSpace AI (Knight AI) - Chat, Analysis, and Threat Enhancement
 * Supports streaming SSE responses for real-time chat
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
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
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('ai_features_enabled, ai_chat_enabled, ai_analysis_enabled, ai_monthly_quota, ai_quota_used, tier')
      .eq('id', user.id)
      .single();

    const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!aiApiKey || !aiBaseUrl) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data, streaming } = await req.json();
    const quotaUsed = profile?.ai_quota_used || 0;

    switch (action) {
      case 'chat': {
        const { messages, conversationId, model = 'google/gemini-3-flash-preview' } = data;

        const systemMessage = {
          role: 'system',
          content: `You are Knight AI, an expert cybersecurity assistant and scam detection specialist for Scammer's Knightmare. 
You help users identify scams, phishing attempts, fraud, and online predators.
Your personality: protective, bold, helpful, and vigilant. You speak clearly and directly.
Specialties: fraud detection, phishing analysis, social engineering tactics, online predator patterns, dark web monitoring, financial scams.
Always provide actionable advice and specific warning signs to watch for.`
        };

        const allMessages = [systemMessage, ...messages];

        if (streaming) {
          // Streaming SSE response
          const upstreamResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: allMessages,
              temperature: 0.7,
              max_tokens: 2000,
              stream: true,
            }),
          });

          if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            return new Response(
              JSON.stringify({ error: `AI: ${errorText}` }),
              { status: upstreamResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Save conversation ID asynchronously (don't await)
          let convId = conversationId;
          if (!convId) {
            supabaseAdmin
              .from('ai_conversations')
              .insert({
                user_id: user.id,
                model,
                title: messages[0]?.content?.substring(0, 100) || 'New Chat',
              })
              .select()
              .single()
              .then(({ data: newConv }) => {
                // We can't send this back in stream, client handles it
              });
          }

          // Increment quota
          supabaseAdmin
            .from('user_profiles')
            .update({ ai_quota_used: quotaUsed + 1 })
            .eq('id', user.id);

          // Pipe the upstream SSE stream directly to client
          return new Response(upstreamResponse.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        // Non-streaming response
        const response = await fetch(`${aiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: allMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        let convId = conversationId;
        if (!convId) {
          const { data: newConv } = await supabaseAdmin
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

        if (convId) {
          await supabaseAdmin.from('ai_messages').insert([
            { conversation_id: convId, role: 'user', content: messages[messages.length - 1].content },
            { conversation_id: convId, role: 'assistant', content: result.choices[0].message.content },
          ]);
          await supabaseAdmin
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);
        }

        const tokens = result.usage?.total_tokens || 1000;
        await supabaseAdmin.from('ai_usage_log').insert({
          user_id: user.id,
          conversation_id: convId,
          model,
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: tokens,
          feature_type: 'chat',
          cost: tokens * 0.000001,
        });

        await supabaseAdmin
          .from('user_profiles')
          .update({ ai_quota_used: quotaUsed + 1 })
          .eq('id', user.id);

        return new Response(
          JSON.stringify({ ...result, conversationId: convId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'analyze': {
        const { text, analysisType = 'general' } = data;

        const systemPrompts: Record<string, string> = {
          threat: `You are an expert threat analyst for Scammer's Knightmare. 
Analyze the provided content for potential scams, phishing, fraud, predator behavior, or malicious intent.
Provide: 1) Threat Level (SAFE/LOW/MEDIUM/HIGH/CRITICAL), 2) Key Red Flags found, 3) Specific type of threat, 4) Recommended action.
Be direct and specific. Use concrete examples from the text.`,
          sentiment: 'You are a communication analyst. Analyze the emotional tone, intent, manipulation tactics, and urgency in the provided content. Identify grooming patterns or pressure tactics.',
          general: 'You are Knight AI, a cybersecurity assistant. Analyze and provide insights about the provided content from a security perspective.',
        };

        const response = await fetch(`${aiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: systemPrompts[analysisType] || systemPrompts.general },
              { role: 'user', content: text },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        await supabaseAdmin.from('ai_usage_log').insert({
          user_id: user.id,
          model: 'google/gemini-3-flash-preview',
          total_tokens: result.usage?.total_tokens || 500,
          feature_type: 'analysis',
          cost: (result.usage?.total_tokens || 500) * 0.000001,
        });

        await supabaseAdmin.from('user_profiles').update({ ai_quota_used: quotaUsed + 1 }).eq('id', user.id);

        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enhance-scan': {
        const { scanResult, scanType } = data;

        const response = await fetch(`${aiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are Knight AI, an expert cybersecurity threat analyst for Scammer's Knightmare.
Review scan results and provide:
1. Enhanced threat context and explanation
2. Specific attack vectors this threat uses
3. Real-world examples of this type of scam
4. Step-by-step protection advice
5. What to do if already victimized

Format your response in clear sections with emojis for readability.`,
              },
              {
                role: 'user',
                content: `Scan Type: ${scanType}\n\nScan Results:\n${JSON.stringify(scanResult, null, 2)}\n\nProvide comprehensive analysis and actionable recommendations.`,
              },
            ],
            temperature: 0.4,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();

        await supabaseAdmin.from('ai_usage_log').insert({
          user_id: user.id,
          model: 'google/gemini-3-flash-preview',
          total_tokens: result.usage?.total_tokens || 800,
          feature_type: 'threat_detection',
          cost: (result.usage?.total_tokens || 800) * 0.000001,
        });

        await supabaseAdmin.from('user_profiles').update({ ai_quota_used: quotaUsed + 1 }).eq('id', user.id);

        return new Response(
          JSON.stringify({
            enhancement: result.choices[0].message.content,
            model: 'google/gemini-3-flash-preview',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'predator-analyze': {
        const { content, context, streaming: streamPredator } = data;

        if (streamPredator) {
          const upstreamResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [
                {
                  role: 'system',
                  content: `You are PredatorWatch AI, a specialized child safety and predator detection system within Scammer's Knightmare.
Analyze messages, profiles, or behavior patterns for:
- Grooming tactics (building trust, isolation, normalization)
- Age/identity deception indicators
- Inappropriate conversation escalation
- Known predator language patterns
- Platform evasion tactics
- Requests for photos, videos, or in-person meetings

Provide a detailed analysis with:
1. 🚨 THREAT LEVEL: (SAFE / LOW / MEDIUM / HIGH / CRITICAL)
2. 🔍 RED FLAGS DETECTED: List each specific concerning pattern found
3. 🧠 PSYCHOLOGICAL TACTICS: Identify manipulation methods being used
4. ⚡ IMMEDIATE ACTIONS: What to do right now
5. 📋 EVIDENCE TO PRESERVE: What to screenshot/save for authorities
6. 🚔 REPORTING: Where and how to report this

Be thorough and specific. This is used to protect children and vulnerable people.`
                },
                {
                  role: 'user',
                  content: `Context: ${context || 'Social media / messaging'}\n\nContent to analyze:\n${content}`
                }
              ],
              temperature: 0.2,
              max_tokens: 2000,
              stream: true,
            }),
          });

          if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            return new Response(
              JSON.stringify({ error: `AI: ${errorText}` }),
              { status: upstreamResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          await supabaseAdmin.from('user_profiles').update({ ai_quota_used: quotaUsed + 1 }).eq('id', user.id);

          return new Response(upstreamResponse.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
          });
        }

        const response = await fetch(`${aiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are PredatorWatch AI, a specialized child safety and predator detection system within Scammer's Knightmare.
Analyze messages, profiles, or behavior patterns for grooming tactics, age deception, inappropriate escalation, predator language patterns, and evasion tactics.
Provide: 1) THREAT LEVEL, 2) RED FLAGS DETECTED, 3) PSYCHOLOGICAL TACTICS, 4) IMMEDIATE ACTIONS, 5) REPORTING GUIDANCE.`
              },
              {
                role: 'user',
                content: `Context: ${context || 'unknown'}\n\nContent to analyze:\n${content}`
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `AI: ${errorText}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await response.json();
        await supabaseAdmin.from('user_profiles').update({ ai_quota_used: quotaUsed + 1 }).eq('id', user.id);

        return new Response(
          JSON.stringify({
            analysis: result.choices[0].message.content,
            model: 'google/gemini-3-flash-preview',
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
    console.error('Knight AI Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
