/**
 * Real Phone Lookup & Threat Scan using IPQS
 * Supports: phone, email, IP, URL with full IPQS data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, value, user_id } = await req.json();

    if (!type || !value) {
      return new Response(
        JSON.stringify({ error: 'Missing type or value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipqsApiKey = Deno.env.get('IPQS_API_KEY') ?? 'In1yoDEyIM77tl2YbErlcy0acRu1gY8d';
    const IPQS_BASE = 'https://ipqualityscore.com/api/json';

    let ipqsUrl = '';
    let result: any = {};

    switch (type) {
      case 'phone': {
        const cleaned = value.replace(/\D/g, '');
        // Try with country detection
        ipqsUrl = `${IPQS_BASE}/phone/${ipqsApiKey}/${encodeURIComponent(value)}?country[]=US&country[]=CA&strictness=1`;
        console.log('IPQS Phone URL:', ipqsUrl);

        const resp = await fetch(ipqsUrl, {
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error('IPQS error response:', txt);
          throw new Error(`IPQS phone check failed: ${resp.status} - ${txt}`);
        }

        const data = await resp.json();
        console.log('IPQS phone data:', JSON.stringify(data));

        if (!data.success) {
          throw new Error(`IPQS: ${data.message || 'Phone lookup failed'}`);
        }

        result = {
          success: true,
          type: 'phone',
          value,
          phone_data: {
            valid: data.valid,
            active: data.active,
            fraud_score: data.fraud_score,
            recent_abuse: data.recent_abuse,
            risky: data.risky,
            VOIP: data.VOIP,
            leaked: data.leaked,
            prepaid: data.prepaid,
            do_not_call: data.do_not_call,
          },
          carrier: {
            name: data.carrier || 'Unknown',
            line_type: data.line_type || 'Unknown',
          },
          location: {
            country: data.country || 'Unknown',
            region: data.region || 'Unknown',
            city: data.city || 'Unknown',
            zip_code: data.zip_code || 'Unknown',
            timezone: data.timezone || 'Unknown',
            latitude: data.latitude,
            longitude: data.longitude,
            dialing_code: data.dialing_code,
            local_format: data.local_format,
            international_format: data.international_format,
          },
          risk_assessment: {
            fraud_score: data.fraud_score || 0,
            is_voip: data.VOIP || false,
            is_valid: data.valid || false,
            is_risky: data.risky || false,
            spam_score: data.fraud_score || 0,
            threat_level:
              data.fraud_score >= 85 ? 'CRITICAL' :
              data.fraud_score >= 70 ? 'HIGH' :
              data.fraud_score >= 50 ? 'MEDIUM' :
              data.fraud_score >= 25 ? 'LOW' : 'SAFE',
          },
          raw: data,
        };
        break;
      }

      case 'email': {
        ipqsUrl = `${IPQS_BASE}/email/${ipqsApiKey}/${encodeURIComponent(value)}?strictness=1&timeout=5`;
        const resp = await fetch(ipqsUrl, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`IPQS email check failed: ${resp.status}`);
        const data = await resp.json();
        if (!data.success) throw new Error(`IPQS: ${data.message || 'Email lookup failed'}`);

        result = {
          success: true,
          type: 'email',
          value,
          email_data: {
            valid: data.valid,
            disposable: data.disposable,
            deliverability: data.deliverability,
            fraud_score: data.fraud_score,
            recent_abuse: data.recent_abuse,
            spam_trap_score: data.spam_trap_score,
            leaked: data.leaked,
            catch_all: data.catch_all,
            suspect: data.suspect,
            dns_valid: data.dns_valid,
            smtp_score: data.smtp_score,
            suggested_domain: data.suggested_domain,
          },
          risk_assessment: {
            fraud_score: data.fraud_score || 0,
            threat_level:
              data.fraud_score >= 85 ? 'CRITICAL' :
              data.fraud_score >= 70 ? 'HIGH' :
              data.disposable ? 'HIGH' :
              data.fraud_score >= 50 ? 'MEDIUM' :
              data.fraud_score >= 25 ? 'LOW' : 'SAFE',
          },
          raw: data,
        };
        break;
      }

      case 'ip': {
        ipqsUrl = `${IPQS_BASE}/ip/${ipqsApiKey}/${encodeURIComponent(value)}?strictness=1`;
        const resp = await fetch(ipqsUrl, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`IPQS IP check failed: ${resp.status}`);
        const data = await resp.json();
        if (!data.success) throw new Error(`IPQS: ${data.message || 'IP lookup failed'}`);

        result = {
          success: true,
          type: 'ip',
          value,
          ip_data: {
            fraud_score: data.fraud_score,
            country_code: data.country_code,
            region: data.region,
            city: data.city,
            ISP: data.ISP,
            ASN: data.ASN,
            proxy: data.proxy,
            vpn: data.vpn,
            tor: data.tor,
            bot_status: data.bot_status,
            recent_abuse: data.recent_abuse,
            abuse_velocity: data.abuse_velocity,
          },
          location: {
            country: data.country_code,
            region: data.region,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
          },
          risk_assessment: {
            fraud_score: data.fraud_score || 0,
            is_proxy: data.proxy || false,
            is_vpn: data.vpn || false,
            is_tor: data.tor || false,
            threat_level:
              data.fraud_score >= 85 ? 'CRITICAL' :
              data.fraud_score >= 70 ? 'HIGH' :
              data.fraud_score >= 50 ? 'MEDIUM' :
              data.fraud_score >= 25 ? 'LOW' : 'SAFE',
          },
          raw: data,
        };
        break;
      }

      case 'url': {
        ipqsUrl = `${IPQS_BASE}/url/${ipqsApiKey}/${encodeURIComponent(value)}?strictness=2`;
        const resp = await fetch(ipqsUrl, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) throw new Error(`IPQS URL check failed: ${resp.status}`);
        const data = await resp.json();

        result = {
          success: true,
          type: 'url',
          value,
          url_data: {
            unsafe: data.unsafe,
            malware: data.malware,
            phishing: data.phishing,
            spamming: data.spamming,
            suspicious: data.suspicious,
            risk_score: data.risk_score,
            domain: data.domain,
            ip_address: data.ip_address,
            country_code: data.country_code,
            domain_rank: data.domain_rank,
            domain_age: data.domain_age,
            adult: data.adult,
          },
          risk_assessment: {
            fraud_score: data.risk_score || 0,
            is_malware: data.malware || false,
            is_phishing: data.phishing || false,
            threat_level:
              data.malware || data.phishing ? 'CRITICAL' :
              data.risk_score >= 85 ? 'CRITICAL' :
              data.risk_score >= 70 ? 'HIGH' :
              data.risk_score >= 50 ? 'MEDIUM' :
              data.risk_score >= 25 ? 'LOW' : 'SAFE',
          },
          raw: data,
        };
        break;
      }

      default:
        throw new Error(`Unsupported lookup type: ${type}`);
    }

    // Cache to DB if user provided
    if (user_id && type === 'phone') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin
        .from('reverse_lookup_cache')
        .upsert({
          phone_number: value,
          owner_info: result.phone_data || {},
          carrier_info: result.carrier || {},
          location_info: result.location || {},
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'phone_number' });
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Reverse lookup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Lookup failed', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
