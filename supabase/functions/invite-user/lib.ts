// Pure helpers for the invite-user function. No Deno/network APIs, so they
// can be unit-tested in isolation (see lib.test.ts).

export type Role = "admin" | "gm" | "player";
export const ROLES: readonly Role[] = ["admin", "gm", "player"];

export interface InviteInput {
  email: string;
  campaignId: string;
  role: Role;
}

export interface Membership {
  is_admin: boolean | null;
  is_gm: boolean | null;
  is_player: boolean | null;
}

/** Max invitations one user can create per window. */
export const RATE_LIMIT = { max: 20, windowMinutes: 60 };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Deliberately strict: no whitespace, quotes or angle brackets anywhere.
const EMAIL_RE = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`.]{2,}$/;

export type ParseResult =
  | { ok: true; value: InviteInput }
  | { ok: false; error: string };

export function parseInviteInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request" };
  }
  const { email, campaignId, role } = body as Record<string, unknown>;

  if (typeof email !== "string") {
    return { ok: false, error: "Invalid email address" };
  }
  const normalised = email.trim().toLowerCase();
  if (normalised.length > 254 || !EMAIL_RE.test(normalised)) {
    return { ok: false, error: "Invalid email address" };
  }
  if (typeof campaignId !== "string" || !UUID_RE.test(campaignId)) {
    return { ok: false, error: "Invalid campaign" };
  }
  if (typeof role !== "string" || !ROLES.includes(role as Role)) {
    return { ok: false, error: "Invalid role" };
  }
  return {
    ok: true,
    value: { email: normalised, campaignId, role: role as Role },
  };
}

/**
 * Admins (and the campaign creator) may invite any role; GMs may invite
 * players only, so a GM can't mint new admins or GMs.
 */
export function canInvite(opts: {
  isCreator: boolean;
  membership: Membership | null;
  role: Role;
}): boolean {
  if (opts.isCreator || opts.membership?.is_admin) return true;
  if (opts.membership?.is_gm) return opts.role === "player";
  return false;
}

export function rolesOffered(role: Role) {
  return {
    isAdmin: role === "admin",
    isGm: role === "gm",
    isPlayer: role === "player",
  };
}

export function roleLabel(role: Role): string {
  return { admin: "Admin", gm: "Game Master", player: "Player" }[role];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * User-controlled text for places we can't escape ourselves (e.g. email
 * subjects, template params): strips control characters and angle brackets,
 * collapses whitespace, and caps the length.
 */
export function plainText(value: string, max = 100): string {
  const noControl = Array.from(value, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? " " : ch;
  }).join("");
  const cleaned = noControl.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

/** Escapes LIKE/ILIKE wildcards so an email matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function buildAcceptUrl(appUrl: string, invitationId: string): string {
  const url = new URL(appUrl);
  url.searchParams.set("invitation", invitationId);
  return url.toString();
}

export function parseAllowedOrigins(appUrl: string, extra?: string): string[] {
  const extras = (extra ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [new URL(appUrl).origin, ...extras];
}

export function corsHeaders(
  origin: string | null,
  allowedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function buildEmail(opts: {
  inviterName: string;
  campaignName: string;
  role: Role;
  acceptUrl: string;
}): { subject: string; html: string } {
  const inviter = escapeHtml(plainText(opts.inviterName, 60));
  const campaign = escapeHtml(plainText(opts.campaignName, 100));
  const role = escapeHtml(roleLabel(opts.role));
  const url = escapeHtml(opts.acceptUrl);

  return {
    subject: `You've been invited to join ${plainText(opts.campaignName, 100)}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campaign Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; }
    h2 { color: #3498db; }
    .button { background-color: #3498db; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    .url-box { background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>You've been invited to join a Traveller campaign!</h1>
  <p>Hi there,</p>
  <p><strong>${inviter}</strong> has invited you to join their campaign as <strong>${role}</strong>:</p>
  <h2>${campaign}</h2>
  <p>Sign in or create an account with this email address to accept:</p>
  <a href="${url}" class="button">View Invitation</a>
  <p>Or copy and paste this link into your browser:</p>
  <div class="url-box">${url}</div>
  <div class="footer">
    <p>If you didn't expect this invitation, you can safely ignore this email. It expires in 14 days.</p>
    <p>This is an automated message from Traveller Dashboard.</p>
  </div>
</body>
</html>`,
  };
}
