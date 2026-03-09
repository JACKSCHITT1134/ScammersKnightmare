import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending emails from queue
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    // Process each email
    for (const email of emails) {
      try {
        if (!RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY not configured');
        }

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Scammer\'s Knightmare <notifications@scammersknightmare.com>',
            to: [email.recipient_email],
            subject: email.subject,
            text: email.body,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API: ${errorText}`);
        }

        // Mark as sent
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        successCount++;
        console.log(`Email sent successfully to ${email.recipient_email}`);
      } catch (error: any) {
        // Mark as failed
        await supabaseAdmin
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', email.id);

        failCount++;
        console.error(`Failed to send email to ${email.recipient_email}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Email processing complete',
        processed: emails.length,
        successful: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Email service error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
