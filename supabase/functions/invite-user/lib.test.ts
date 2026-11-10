// Run: deno test supabase/functions/invite-user/
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1.0.13";
import {
  buildAcceptUrl,
  buildEmail,
  canInvite,
  corsHeaders,
  escapeHtml,
  escapeLike,
  parseAllowedOrigins,
  parseInviteInput,
  plainText,
  rolesOffered,
} from "./lib.ts";

const CAMPAIGN = "11111111-1111-1111-1111-111111111111";
const member = (is_admin: boolean, is_gm: boolean, is_player: boolean) => ({
  is_admin,
  is_gm,
  is_player,
});

Deno.test("parseInviteInput: accepts and normalises a valid request", () => {
  const r = parseInviteInput({
    email: "  Carol@Example.COM ",
    campaignId: CAMPAIGN,
    role: "player",
  });
  assert(r.ok);
  assertEquals(r.value, {
    email: "carol@example.com",
    campaignId: CAMPAIGN,
    role: "player",
  });
});

Deno.test("parseInviteInput: rejects bad input", () => {
  const bad: unknown[] = [
    null,
    "string",
    { email: "x@example.com", campaignId: CAMPAIGN }, // no role
    { email: "x@example.com", campaignId: CAMPAIGN, role: "owner" },
    { email: "x@example.com", campaignId: "not-a-uuid", role: "player" },
    {
      email: "x@example.com",
      campaignId: `${CAMPAIGN}' OR 1=1`,
      role: "player",
    },
    { email: "no-at-sign", campaignId: CAMPAIGN, role: "player" },
    { email: "a b@example.com", campaignId: CAMPAIGN, role: "player" },
    { email: "<script>@example.com", campaignId: CAMPAIGN, role: "player" },
    {
      email: "a@example.com\r\nBcc: victim@example.com",
      campaignId: CAMPAIGN,
      role: "player",
    },
    {
      email: `${"a".repeat(250)}@example.com`,
      campaignId: CAMPAIGN,
      role: "player",
    },
    { email: 42, campaignId: CAMPAIGN, role: "player" },
  ];
  for (const body of bad) {
    assertFalse(
      parseInviteInput(body).ok,
      `should reject ${JSON.stringify(body)}`
    );
  }
});

Deno.test("canInvite: creator and admins may invite any role", () => {
  for (const role of ["admin", "gm", "player"] as const) {
    assert(canInvite({ isCreator: true, membership: null, role }));
    assert(
      canInvite({
        isCreator: false,
        membership: member(true, false, false),
        role,
      })
    );
  }
});

Deno.test("canInvite: GMs may invite players only", () => {
  const gm = member(false, true, false);
  assert(canInvite({ isCreator: false, membership: gm, role: "player" }));
  assertFalse(canInvite({ isCreator: false, membership: gm, role: "gm" }));
  assertFalse(canInvite({ isCreator: false, membership: gm, role: "admin" }));
});

Deno.test("canInvite: players and non-members may not invite", () => {
  for (const role of ["admin", "gm", "player"] as const) {
    assertFalse(
      canInvite({
        isCreator: false,
        membership: member(false, false, true),
        role,
      })
    );
    assertFalse(canInvite({ isCreator: false, membership: null, role }));
    assertFalse(
      canInvite({
        isCreator: false,
        membership: member(false, false, false),
        role,
      })
    );
  }
});

Deno.test("rolesOffered maps exactly one flag", () => {
  assertEquals(rolesOffered("gm"), {
    isAdmin: false,
    isGm: true,
    isPlayer: false,
  });
});

Deno.test("escapeHtml neutralises markup", () => {
  assertEquals(
    escapeHtml(`<a href="x" onclick='y'>&</a>`),
    "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
  );
});

Deno.test("plainText strips tags/control chars and caps length", () => {
  assertEquals(
    plainText("Spin<b>ward</b>\r\nMarches\u0000"),
    "Spinbward/b Marches"
  );
  assertEquals(plainText("x".repeat(200), 10).length, 10);
});

Deno.test("buildEmail escapes every user-controlled value", () => {
  const { subject, html } = buildEmail({
    inviterName: `<img src=x onerror=alert(1)>`,
    campaignName: `Evil <a href="https://phish.example">click</a>`,
    role: "player",
    acceptUrl: "https://app.example/traveller-dashboard/?invitation=abc",
  });
  assertFalse(html.includes("<img"), "inviter name must be escaped");
  assertFalse(
    html.includes(`<a href="https://phish.example"`),
    "campaign name must be escaped"
  );
  assertFalse(subject.includes("<"), "subject must not contain markup");
  assert(
    html.includes(
      `href="https://app.example/traveller-dashboard/?invitation=abc"`
    )
  );
});

Deno.test("buildAcceptUrl uses the configured app URL only", () => {
  assertEquals(
    buildAcceptUrl("https://app.example/traveller-dashboard/", "abc"),
    "https://app.example/traveller-dashboard/?invitation=abc"
  );
  // An id can't break out of the query string
  assert(
    buildAcceptUrl(
      "https://app.example/x/",
      "a&next=https://evil.example"
    ).startsWith("https://app.example/x/?invitation=a%26next")
  );
});

Deno.test("CORS: only allowed origins are echoed", () => {
  const allowed = parseAllowedOrigins(
    "https://app.example/traveller-dashboard/",
    "http://localhost:5173, "
  );
  assertEquals(allowed, ["https://app.example", "http://localhost:5173"]);
  assertEquals(
    corsHeaders("https://app.example", allowed)["Access-Control-Allow-Origin"],
    "https://app.example"
  );
  assertEquals(
    corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"],
    undefined
  );
  assertEquals(
    corsHeaders(null, allowed)["Access-Control-Allow-Origin"],
    undefined
  );
});

Deno.test("escapeLike makes wildcards literal", () => {
  assertEquals(
    escapeLike("a_b%c\\d@example.com"),
    "a\\_b\\%c\\\\d@example.com"
  );
});
