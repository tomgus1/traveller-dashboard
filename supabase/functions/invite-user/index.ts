// invite-user: lets a campaign admin (any role) or GM (players only) invite
// someone by email. Creates a campaign_invitations row, which the invitee sees
// in the app when they sign in with that address, and emails them if an email
// provider is configured.
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by
// Supabase), APP_URL (e.g. https://example.com/traveller-dashboard/).
// Optional: BREVO_API_KEY (no key = no email; invitations still work in-app),
// BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, BREVO_TEMPLATE_ID,
// EXTRA_ALLOWED_ORIGINS (comma-separated, e.g. http://localhost:5173).
//
// The service-role client bypasses RLS, so every authorisation decision is
// made explicitly here.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildAcceptUrl,
  buildEmail,
  canInvite,
  corsHeaders,
  escapeLike,
  type InviteInput,
  parseAllowedOrigins,
  parseInviteInput,
  plainText,
  RATE_LIMIT,
  roleLabel,
  rolesOffered,
} from "./lib.ts";

const required = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  APP_URL: Deno.env.get("APP_URL") ?? "",
};

const env = {
  supabaseUrl: required.SUPABASE_URL,
  serviceKey: required.SUPABASE_SERVICE_ROLE_KEY,
  brevoKey: Deno.env.get("BREVO_API_KEY") ?? "",
  appUrl: required.APP_URL,
  senderEmail: Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@example.com",
  senderName: Deno.env.get("BREVO_SENDER_NAME") ?? "Traveller Dashboard",
  templateId: Deno.env.get("BREVO_TEMPLATE_ID"),
  extraOrigins: Deno.env.get("EXTRA_ALLOWED_ORIGINS"),
};

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

let allowedOrigins: string[] = [];
try {
  if (env.appUrl)
    allowedOrigins = parseAllowedOrigins(env.appUrl, env.extraOrigins);
} catch {
  missing.push("APP_URL (not a valid URL)");
}

function log(event: string, data: Record<string, unknown> = {}) {
  // Structured, no PII (no email addresses): visible in Supabase function logs.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ fn: "invite-user", event, ...data }));
}

/** A response to send back immediately; steps return one to stop the flow. */
class Reject {
  constructor(
    readonly status: number,
    readonly error: string
  ) {}
}

type Db = SupabaseClient;

// --- Steps ---------------------------------------------------------------

/** A real user session, not just the public anon key. */
async function authenticate(
  db: Db,
  req: Request
): Promise<{ id: string } | Reject> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token)
    return new Reject(401, "You must be signed in to send invitations");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    return new Reject(401, "You must be signed in to send invitations");
  return { id: data.user.id };
}

async function parseBody(req: Request): Promise<InviteInput | Reject> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Reject(400, "Invalid request");
  }
  const parsed = parseInviteInput(body);
  return parsed.ok ? parsed.value : new Reject(400, parsed.error);
}

/** Missing campaign and no permission look the same, so ids can't be probed. */
async function authorise(
  db: Db,
  callerId: string,
  input: InviteInput
): Promise<{ name: string } | Reject> {
  const forbidden = new Reject(
    403,
    "You don't have permission to invite members to this campaign"
  );
  const { data: campaign } = await db
    .from("campaigns")
    .select("name, created_by")
    .eq("id", input.campaignId)
    .maybeSingle();
  if (!campaign) return forbidden;

  const { data: membership } = await db
    .from("campaign_members")
    .select("is_admin, is_gm, is_player")
    .eq("campaign_id", input.campaignId)
    .eq("user_id", callerId)
    .maybeSingle();

  const allowed = canInvite({
    isCreator: campaign.created_by === callerId,
    membership,
    role: input.role,
  });
  if (!allowed) {
    log("forbidden", {
      caller: callerId,
      campaignId: input.campaignId,
      role: input.role,
    });
    return forbidden;
  }
  return { name: campaign.name };
}

async function checkRateLimit(
  db: Db,
  callerId: string
): Promise<Reject | null> {
  const since = new Date(
    Date.now() - RATE_LIMIT.windowMinutes * 60_000
  ).toISOString();
  const { count } = await db
    .from("campaign_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", callerId)
    .gte("created_at", since);
  if ((count ?? 0) < RATE_LIMIT.max) return null;
  log("rate_limited", { caller: callerId });
  return new Reject(
    429,
    "Too many invitations sent recently. Please try again later."
  );
}

/**
 * Rejects if the person is already a member or has a live invitation.
 * Clears expired/declined/accepted invitations so they don't block a new one.
 */
async function checkNotAlreadyInvited(
  db: Db,
  input: InviteInput
): Promise<Reject | null> {
  const emailPattern = escapeLike(input.email);

  const { data: existingUser } = await db
    .from("user_profiles")
    .select("id")
    .ilike("email", emailPattern)
    .maybeSingle();
  if (existingUser) {
    const { data: existingMember } = await db
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", input.campaignId)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (existingMember) {
      return new Reject(
        409,
        "That person is already a member of this campaign"
      );
    }
  }

  const { data: previous } = await db
    .from("campaign_invitations")
    .select("id, status, expires_at")
    .eq("campaign_id", input.campaignId)
    .ilike("invited_email", emailPattern);
  const rows = previous ?? [];
  const now = Date.now();
  if (
    rows.some(
      (i) => i.status === "pending" && new Date(i.expires_at).getTime() > now
    )
  ) {
    return new Reject(409, "An invitation to that email is already pending");
  }
  if (rows.length > 0) {
    await db
      .from("campaign_invitations")
      .delete()
      .in(
        "id",
        rows.map((i) => i.id)
      );
  }
  return null;
}

async function createInvitation(
  db: Db,
  callerId: string,
  input: InviteInput
): Promise<{ id: string } | Reject> {
  const { data, error } = await db
    .from("campaign_invitations")
    .insert({
      campaign_id: input.campaignId,
      invited_email: input.email,
      invited_by: callerId,
      roles_offered: rolesOffered(input.role),
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) {
    log("insert_failed", { code: error?.code, message: error?.message });
    return new Reject(500, "Could not create the invitation");
  }
  return { id: data.id };
}

async function sendInvitationEmail(
  db: Db,
  callerId: string,
  input: InviteInput,
  campaignName: string,
  invitationId: string
): Promise<boolean> {
  if (!env.brevoKey) return false;

  const { data: inviter } = await db
    .from("user_profiles")
    .select("display_name, username")
    .eq("id", callerId)
    .maybeSingle();
  const inviterName =
    inviter?.display_name || inviter?.username || "A fellow traveller";
  const acceptUrl = buildAcceptUrl(env.appUrl, invitationId);

  const message: Record<string, unknown> = {
    sender: { name: env.senderName, email: env.senderEmail },
    to: [{ email: input.email }],
  };
  if (env.templateId) {
    message.templateId = Number.parseInt(env.templateId, 10);
    message.params = {
      campaignName: plainText(campaignName),
      inviterName: plainText(inviterName, 60),
      role: roleLabel(input.role),
      acceptUrl,
    };
  } else {
    const { subject, html } = buildEmail({
      inviterName,
      campaignName,
      role: input.role,
      acceptUrl,
    });
    message.subject = subject;
    message.htmlContent = html;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.brevoKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return true;
    log("email_failed", {
      status: res.status,
      body: (await res.text()).slice(0, 500),
    });
  } catch (err) {
    log("email_network_error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return false;
}

// --- Handler -------------------------------------------------------------

async function inviteUser(
  req: Request
): Promise<Reject | { invitationId: string; emailSent: boolean }> {
  const db = createClient(env.supabaseUrl, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const caller = await authenticate(db, req);
  if (caller instanceof Reject) return caller;

  const input = await parseBody(req);
  if (input instanceof Reject) return input;

  const campaign = await authorise(db, caller.id, input);
  if (campaign instanceof Reject) return campaign;

  const blocked =
    (await checkRateLimit(db, caller.id)) ??
    (await checkNotAlreadyInvited(db, input));
  if (blocked) return blocked;

  const invitation = await createInvitation(db, caller.id, input);
  if (invitation instanceof Reject) return invitation;

  // The invitation stands either way: the invitee sees it in the app when they
  // sign in with that email. The email is just a heads-up.
  const emailSent = await sendInvitationEmail(
    db,
    caller.id,
    input,
    campaign.name,
    invitation.id
  );

  log("invited", {
    caller: caller.id,
    campaignId: input.campaignId,
    invitationId: invitation.id,
    role: input.role,
    emailSent,
  });
  return { invitationId: invitation.id, emailSent };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), allowedOrigins);
  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return respond(405, { error: "Method not allowed" });
  if (missing.length > 0) {
    log("config_missing", { missing });
    return respond(500, { error: "Invitations are temporarily unavailable" });
  }

  try {
    const result = await inviteUser(req);
    if (result instanceof Reject)
      return respond(result.status, { error: result.error });
    return respond(200, { success: true, ...result });
  } catch (err) {
    log("unhandled", {
      message: err instanceof Error ? err.message : String(err),
    });
    return respond(500, { error: "Something went wrong. Please try again." });
  }
});
