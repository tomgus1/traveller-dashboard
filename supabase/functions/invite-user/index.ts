// deno-lint-ignore-file no-console
/* eslint-disable complexity */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const brevoTemplateId = Deno.env.get("BREVO_TEMPLATE_ID"); // Optional
const brevoSenderEmail =
  Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@example.com";
const brevoSenderName =
  Deno.env.get("BREVO_SENDER_NAME") || "Traveller Dashboard";

interface InviteRequest {
  email: string;
  campaignId: string;
  role: "admin" | "gm" | "player";
  campaignName?: string;
}

interface BrevoEmailRequest {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  subject?: string;
  htmlContent?: string;
  templateId?: number;
  params?: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check if environment variables are available
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: `Missing environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseServiceKey}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          details: "BREVO_API_KEY is not set. Please configure Brevo API key.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { email, campaignId, role, campaignName }: InviteRequest =
      await req.json();

    if (!email || !campaignId || !role) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, campaignId, role",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the campaign details and inviter info
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("name, created_by")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter's profile
    const { data: inviterProfile } = await supabase
      .from("user_profiles")
      .select("display_name, email")
      .eq("id", campaign.created_by)
      .single();

    const inviterName =
      inviterProfile?.display_name ||
      inviterProfile?.email ||
      "A fellow traveller";

    // Create invitation record in database
    const rolesOffered = {
      isAdmin: role === "admin",
      isGm: role === "gm",
      isPlayer: role === "player",
    };

    const { data: invitation, error: inviteError } = await supabase
      .from("campaign_invitations")
      .insert({
        campaign_id: campaignId,
        invited_email: email,
        invited_by: campaign.created_by,
        roles_offered: rolesOffered,
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      // Check if invitation already exists
      if (inviteError.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Invitation already exists",
            details: `An invitation for ${email} to this campaign already exists.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to create invitation",
          details: inviteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build acceptance URL
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const baseUrl = origin.includes("github.io")
      ? `${origin}/` // GitHub Pages
      : `${origin}/traveller-dashboard/`; // Local
    const acceptUrl = `${baseUrl}?invitation=${invitation.id}`;

    // Prepare email content
    const emailRequest: BrevoEmailRequest = {
      sender: {
        name: brevoSenderName,
        email: brevoSenderEmail,
      },
      to: [{ email }],
    };

    // Use template if provided, otherwise send simple HTML email
    if (brevoTemplateId) {
      emailRequest.templateId = parseInt(brevoTemplateId);
      emailRequest.params = {
        campaignName: campaign.name || campaignName || "a campaign",
        inviterName,
        acceptUrl,
        role: role.toUpperCase(),
      };
    } else {
      emailRequest.subject = `You've been invited to join ${campaign.name || "a Traveller campaign"}`;
      emailRequest.htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campaign Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; }
    h2 { color: #3498db; }
    .button { background-color: #3498db; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0; }
    .button:hover { background-color: #2980b9; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    .url-box { background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>🚀 You've been invited to join a Traveller campaign!</h1>
  
  <p>Hi there,</p>
  
  <p><strong>${inviterName}</strong> has invited you to join their campaign as a <strong>${role.toUpperCase()}</strong>:</p>
  <h2>${campaign.name || campaignName || "Unnamed Campaign"}</h2>
  
  <p>Click the button below to accept this invitation:</p>
  
  <a href="${acceptUrl}" class="button">Accept Invitation</a>
  
  <p>Or copy and paste this link into your browser:</p>
  <div class="url-box">${acceptUrl}</div>
  
  <div class="footer">
    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    <p>This is an automated message from Traveller Dashboard.</p>
  </div>
</body>
</html>
      `;
    }

    // Send email via Brevo API
    console.log("Sending email via Brevo to:", email); // eslint-disable-line no-console
    console.log("Using sender:", brevoSenderEmail); // eslint-disable-line no-console

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailRequest),
    });

    console.log("Brevo response status:", brevoResponse.status); // eslint-disable-line no-console

    if (!brevoResponse.ok) {
      const brevoError = await brevoResponse.json();
      // Log error for debugging (Deno Deploy will capture this)
      console.error("Brevo API error:", JSON.stringify(brevoError, null, 2)); // eslint-disable-line no-console

      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: brevoError.message || "Unknown error from email service",
          invitationCreated: true,
          invitationId: invitation.id,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const brevoData = await brevoResponse.json();
    console.log("Brevo success! Message ID:", brevoData.messageId); // eslint-disable-line no-console

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation sent successfully",
        invitationId: invitation.id,
        messageId: brevoData.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
