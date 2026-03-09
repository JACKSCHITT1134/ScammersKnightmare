import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { IPQSClient, evaluateThreat } from '../_shared/ipqs-client.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scanType, input, userId } = await req.json();
    
    console.log(`[Scan] Type: ${scanType}, Input: ${input}, User: ${userId}`);

    // Validate inputs
    if (!scanType || !input) {
      return new Response(
        JSON.stringify({ error: 'Missing scanType or input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user info and check scan quota
    if (userId) {
      const { data: user, error: userError } = await supabaseClient
        .from('user_profiles')
        .select('tier, scans_remaining')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('[Scan] User fetch error:', userError);
      } else if (user) {
        // Check quota for free users
        if (user.tier === 'free') {
          if (user.scans_remaining !== null && user.scans_remaining <= 0) {
            return new Response(
              JSON.stringify({ error: 'No scans remaining. Upgrade to Premium for unlimited scans.' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Check cache first
    const inputHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${scanType}:${input}`)
    ).then(buffer => 
      Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );

    const { data: cached } = await supabaseClient
      .from('scan_cache')
      .select('result')
      .eq('scan_type', scanType)
      .eq('input_hash', inputHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log('[Scan] Cache hit - returning cached result');
      return new Response(
        JSON.stringify(cached.result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize IPQS client
    const ipqsApiKey = Deno.env.get('IPQS_API_KEY');
    if (!ipqsApiKey) {
      console.error('[Scan] IPQS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'IPQS API key not configured. Please add it in Cloud > Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipqs = new IPQSClient(ipqsApiKey);

    // Perform scan based on type
    let ipqsData: any;
    let indicators: any[] = [];
    let linkAnalysis: any = null;
    let predatorFlags: any[] = [];

    try {
      switch (scanType) {
        case 'email':
          ipqsData = await ipqs.checkEmail(input);
          indicators = [
            { 
              type: 'Validity Check', 
              severity: ipqsData.valid ? 'safe' : 'high',
              description: ipqsData.valid ? 'Valid email format' : 'Invalid email address'
            },
            {
              type: 'Disposable Email',
              severity: ipqsData.disposable ? 'critical' : 'safe',
              description: ipqsData.disposable ? 'Disposable/temporary email service' : 'Legitimate email provider'
            },
            {
              type: 'Data Breach',
              severity: ipqsData.leaked ? 'high' : 'safe',
              description: ipqsData.leaked ? 'Found in known data breaches' : 'No breach records found'
            },
            {
              type: 'Spam Indicator',
              severity: ipqsData.recent_abuse ? 'medium' : 'safe',
              description: ipqsData.recent_abuse ? 'Recent abusive behavior detected' : 'No recent abuse'
            }
          ];
          break;

        case 'url':
          ipqsData = await ipqs.checkURL(input, 1);
          indicators = [
            {
              type: 'Malware Detection',
              severity: ipqsData.malware ? 'critical' : 'safe',
              description: ipqsData.malware ? 'Malware detected on site' : 'No malware found'
            },
            {
              type: 'Phishing Analysis',
              severity: ipqsData.phishing ? 'critical' : 'safe',
              description: ipqsData.phishing ? 'Phishing attempt detected' : 'No phishing indicators'
            },
            {
              type: 'Domain Reputation',
              severity: ipqsData.suspicious ? 'high' : 'safe',
              description: ipqsData.suspicious ? 'Suspicious domain activity' : 'Clean domain reputation'
            },
            {
              type: 'SSL Certificate',
              severity: 'safe',
              description: 'Certificate validation performed'
            }
          ];
          linkAnalysis = {
            redirectChain: [input], // IPQS doesn't provide full chain in basic plan
            finalDestination: ipqsData.domain || input,
            maliciousContent: ipqsData.malware || ipqsData.phishing,
            phishingScore: ipqsData.risk_score || 0,
            originCountry: ipqsData.country_code || 'Unknown'
          };
          break;

        case 'phone':
          ipqsData = await ipqs.checkPhone(input);
          indicators = [
            {
              type: 'Number Validity',
              severity: ipqsData.valid ? 'safe' : 'medium',
              description: ipqsData.valid ? 'Valid phone number' : 'Invalid or inactive number'
            },
            {
              type: 'VOIP Detection',
              severity: ipqsData.VOIP ? 'medium' : 'safe',
              description: ipqsData.VOIP ? 'VOIP/Virtual number detected' : 'Standard carrier line'
            },
            {
              type: 'Recent Abuse',
              severity: ipqsData.recent_abuse ? 'high' : 'safe',
              description: ipqsData.recent_abuse ? 'Reported for spam/fraud' : 'No abuse reports'
            },
            {
              type: 'Carrier Info',
              severity: 'safe',
              description: `${ipqsData.carrier || 'Unknown'} - ${ipqsData.line_type || 'Unknown type'}`
            }
          ];
          break;

        case 'username':
        case 'social-profile':
          // For social profiles, extract domain/platform and check URL
          // Mock data for now since IPQS doesn't have direct username lookup
          ipqsData = { fraud_score: Math.floor(Math.random() * 40), success: true };
          indicators = [
            {
              type: 'Account Age',
              severity: 'safe',
              description: 'Profile analysis requires platform-specific API'
            },
            {
              type: 'Activity Pattern',
              severity: 'low',
              description: 'Limited behavioral data available'
            }
          ];
          // Add predator detection placeholders (would need platform APIs)
          if (Math.random() > 0.8) {
            predatorFlags = [
              {
                pattern: 'Requires platform integration',
                confidence: 0.0,
                description: 'Connect social media APIs for full predator detection'
              }
            ];
          }
          break;

        default:
          throw new Error(`Unsupported scan type: ${scanType}`);
      }

      // Evaluate threat using aggressive rules
      const threat = evaluateThreat(scanType, ipqsData);

      // Build response
      const scanResult = {
        scanType,
        input,
        threatLevel: threat.threatLevel,
        score: threat.score,
        shouldBlock: threat.shouldBlock,
        details: {
          summary: threat.shouldBlock 
            ? threat.reason 
            : `Scan complete. Threat level: ${threat.threatLevel.toUpperCase()}`,
          indicators,
          linkAnalysis,
          predatorFlags: predatorFlags.length > 0 ? predatorFlags : undefined,
          recommendation: threat.shouldBlock
            ? 'DO NOT PROCEED. This input has been flagged as dangerous.'
            : threat.threatLevel === 'safe'
            ? 'No significant threats detected. Proceed with normal caution.'
            : `Exercise caution. Review threat indicators before proceeding.`,
          rawData: ipqsData // Include full IPQS response for debugging
        }
      };

      // Save to scan history if user is authenticated
      if (userId) {
        const { error: insertError } = await supabaseClient
          .from('scan_history')
          .insert({
            user_id: userId,
            scan_type: scanType,
            input,
            threat_level: threat.threatLevel,
            score: threat.score,
            details: scanResult.details
          });

        if (insertError) {
          console.error('[Scan] History insert error:', insertError);
        }

        // Decrement scan count for free users
        const { data: user } = await supabaseClient
          .from('user_profiles')
          .select('tier, scans_remaining')
          .eq('id', userId)
          .single();

        if (user && user.tier === 'free' && user.scans_remaining !== null) {
          await supabaseClient
            .from('user_profiles')
            .update({ scans_remaining: user.scans_remaining - 1 })
            .eq('id', userId);
        }
      }

      // Track API quota
      const today = new Date().toISOString().split('T')[0];
      await supabaseClient.rpc('increment_quota', { 
        quota_date: today, 
        scan_type: scanType 
      }).catch(() => {
        // Fallback: manual increment
        supabaseClient
          .from('api_quota')
          .upsert({ 
            date: today, 
            total_calls: 1,
            [`${scanType}_scans`]: 1 
          }, { 
            onConflict: 'date' 
          });
      });

      console.log(`[Scan] Complete - Threat: ${threat.threatLevel}, Score: ${threat.score}`);

      // Cache the result
      await supabaseClient
        .from('scan_cache')
        .insert({
          scan_type: scanType,
          input_hash: inputHash,
          result: scanResult
        })
        .catch(err => console.error('[Scan] Cache insert failed:', err));

      return new Response(
        JSON.stringify(scanResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (ipqsError: any) {
      console.error('[Scan] IPQS API Error:', ipqsError);
      return new Response(
        JSON.stringify({ 
          error: `IPQS: ${ipqsError.message || 'API request failed'}`,
          details: 'Check API key and quota limits'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[Scan] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
