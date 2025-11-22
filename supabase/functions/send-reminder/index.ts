// Edge Function: send-reminder
// Sends status update reminder notifications via multiple channels

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  caseId: string;
  helperId: string;
  reporterId?: string;
  phone?: string;
  email?: string;
  preferences?: {
    whatsapp?: boolean;
    email?: boolean;
    push?: boolean;
  };
  escalationLevel: 'normal' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: ReminderRequest = await req.json();
    const { caseId, helperId, reporterId, phone, email, preferences, escalationLevel } = requestData;

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
        reporter:profiles!reporter_id(name, phone, email),
        status_updates(timestamp, condition)
      `)
      .eq('id', caseId)
      .single();

    if (caseError) throw caseError;

    // Get helper details
    const { data: helperData, error: helperError } = await supabase
      .from('profiles')
      .select('name, phone, email, notification_preferences')
      .eq('id', helperId)
      .single();

    if (helperError) throw helperError;

    // Calculate hours since last update
    const lastUpdate = new Date(caseData.last_status_update);
    const hoursSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));

    // Prepare notification data
    const notificationData = {
      caseId,
      animalType: caseData.animal_type,
      condition: caseData.condition,
      hoursSinceUpdate,
      escalationLevel,
      helperName: helperData.name,
      reporterName: caseData.reporter.name,
      reporterPhone: caseData.reporter.phone,
    };

    const notifications = [];

    // Send notifications based on escalation level
    if (escalationLevel === 'normal') {
      // Normal 24-hour reminder to helper only
      notifications.push(
        sendHelperReminder(supabase, helperData, notificationData)
      );
    } else if (escalationLevel === 'medium') {
      // 28-hour: Notify helper and reporter
      notifications.push(
        sendHelperReminder(supabase, helperData, notificationData),
        sendReporterUpdate(supabase, caseData.reporter, notificationData)
      );
    } else if (escalationLevel === 'high') {
      // 36-hour: Notify helper, reporter, and admin
      notifications.push(
        sendHelperReminder(supabase, helperData, notificationData),
        sendReporterUpdate(supabase, caseData.reporter, notificationData),
        sendAdminAlert(supabase, notificationData)
      );
    } else if (escalationLevel === 'critical') {
      // 48-hour: Critical escalation with case reassignment
      notifications.push(
        sendCriticalAlert(supabase, helperData, caseData.reporter, notificationData)
      );
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notifications);

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Reminder sent for case ${caseId}: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        caseId,
        escalationLevel,
        notificationsSent: successful,
        notificationsFailed: failed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending reminder:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Send reminder to helper
async function sendHelperReminder(supabase: any, helper: any, data: any) {
  const prefs = helper.notification_preferences || {};
  const notifications = [];

  const message = `🔔 Status Update Reminder

Case ID: ${data.caseId}
Animal: ${data.animalType}
Time since last update: ${data.hoursSinceUpdate} hours

⚠️ Please provide a status update with 2 photos as soon as possible.

The animal's welfare depends on regular updates. Thank you for your dedication!`;

  // WhatsApp notification
  if (prefs.whatsapp && helper.phone) {
    notifications.push(
      sendWhatsAppMessage(helper.phone, message)
    );
  }

  // Email notification
  if (prefs.email && helper.email) {
    notifications.push(
      sendEmailNotification(helper.email, 'Status Update Reminder', message, data)
    );
  }

  // Push notification (would be handled by mobile app)
  if (prefs.push) {
    notifications.push(
      createPushNotification(supabase, helper, data)
    );
  }

  return Promise.allSettled(notifications);
}

// Send update to reporter
async function sendReporterUpdate(supabase: any, reporter: any, data: any) {
  const message = `📋 Case Update

Case ID: ${data.caseId}
Animal: ${data.animalType}

We're following up with the assigned helper (${data.helperName}) who hasn't provided an update in ${data.hoursSinceUpdate} hours.

We'll keep you informed of any developments.`;

  const notifications = [];

  if (reporter.phone) {
    notifications.push(sendWhatsAppMessage(reporter.phone, message));
  }

  if (reporter.email) {
    notifications.push(
      sendEmailNotification(reporter.email, 'Case Status Update', message, data)
    );
  }

  return Promise.allSettled(notifications);
}

// Send alert to admin
async function sendAdminAlert(supabase: any, data: any) {
  // Get admin users
  const { data: admins } = await supabase
    .from('profiles')
    .select('email, phone')
    .eq('user_type', 'admin')
    .eq('is_active', true);

  if (!admins || admins.length === 0) return;

  const message = `🚨 High Priority Alert

Case ID: ${data.caseId}
Animal: ${data.animalType}
Helper: ${data.helperName}
Hours overdue: ${data.hoursSinceUpdate}

This case requires immediate attention. The assigned helper has not provided updates for over 36 hours.

Please review and take appropriate action.`;

  const notifications = admins.flatMap(admin => [
    admin.email ? sendEmailNotification(admin.email, 'Urgent: Case Requires Attention', message, data) : null,
    admin.phone ? sendWhatsAppMessage(admin.phone, message) : null,
  ].filter(Boolean));

  return Promise.allSettled(notifications);
}

// Send critical alert
async function sendCriticalAlert(supabase: any, helper: any, reporter: any, data: any) {
  const helperMessage = `🚨 CRITICAL: Case Reassignment

Case ID: ${data.caseId}

Due to lack of status updates for ${data.hoursSinceUpdate} hours, this case is being reassigned to another helper.

If you're still able to help, please contact us immediately.`;

  const reporterMessage = `📢 Case Update

Case ID: ${data.caseId}

We're reassigning your case to a new helper due to lack of updates from the previous helper.

A new helper will be notified shortly. We apologize for the delay.`;

  const notifications = [];

  // Notify helper
  if (helper.phone) {
    notifications.push(sendWhatsAppMessage(helper.phone, helperMessage));
  }
  if (helper.email) {
    notifications.push(
      sendEmailNotification(helper.email, 'Case Reassignment Notice', helperMessage, data)
    );
  }

  // Notify reporter
  if (reporter.phone) {
    notifications.push(sendWhatsAppMessage(reporter.phone, reporterMessage));
  }
  if (reporter.email) {
    notifications.push(
      sendEmailNotification(reporter.email, 'Case Reassignment Update', reporterMessage, data)
    );
  }

  return Promise.allSettled(notifications);
}

// WhatsApp integration (placeholder - requires WhatsApp Business API)
async function sendWhatsAppMessage(phone: string, message: string) {
  const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
  const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');

  if (!whatsappApiUrl || !whatsappToken) {
    console.log('WhatsApp not configured, skipping:', phone);
    return;
  }

  try {
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappToken}`,
      },
      body: JSON.stringify({
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    console.log(`WhatsApp sent to ${phone}`);
  } catch (error) {
    console.error('WhatsApp error:', error);
    throw error;
  }
}

// Email integration (placeholder - requires email service like Brevo)
async function sendEmailNotification(email: string, subject: string, message: string, data: any) {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  if (!brevoApiKey) {
    console.log('Email not configured, skipping:', email);
    return;
  }

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'Animal Rescue Platform',
          email: 'noreply@animalrescue.org',
        },
        to: [{ email }],
        subject,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d32f2f;">${subject}</h2>
                <div style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">
                  ${message}
                </div>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666;">
                  This is an automated notification from Animal Rescue Platform.
                  <br>Case ID: ${data.caseId}
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.statusText}`);
    }

    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

// Create push notification record (to be picked up by mobile app)
async function createPushNotification(supabase: any, helper: any, data: any) {
  // In a real implementation, this would integrate with FCM or similar
  // For now, we'll create a notification record in the database
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: helper.id,
      type: 'status_update_reminder',
      title: 'Status Update Reminder',
      body: `Please provide an update for case ${data.caseId}`,
      data: {
        caseId: data.caseId,
        escalationLevel: data.escalationLevel,
      },
    });

  if (error) {
    console.error('Push notification error:', error);
    throw error;
  }

  console.log(`Push notification created for helper`);
}
