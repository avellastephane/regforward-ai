import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = "contact@regforwardai.com";
const RESEND_TO = "contact@regforwardai.com";

const SERVICE_LABELS: Record<string, string> = {
  signalpath: "RegForward Pulse — leads & briefs",
  regchat: "RegForward Navigate — source-linked answers",
  "meeting-simulation": "RegForward Rehearse — agency meeting simulation",
  "meeting-prep": "Agency Meeting Preparation",
  ctd: "RegForward Author — CMC submission authoring",
  enablement: "Consultant Enablement",
  strategy: "CMC Strategy & Gap Assessment",
  inspection: "Inspection Preparation & Response (planned)",
  lifecycle: "CMC Lifecycle & Change Assessment (planned)",
  "due-diligence": "RegForward DD — CMC due diligence (planned)",
  general: "General inquiry",
};

const TIMING_LABELS: Record<string, string> = {
  exploring: "Exploring",
  "within-1-month": "Within 1 month",
  "within-3-months": "Within 3 months",
  later: "Later",
};

const VALID_SERVICES = [
  "signalpath", "regchat", "meeting-simulation", "meeting-prep",
  "ctd", "enablement", "strategy", "inspection", "lifecycle", "due-diligence",
  "general",
];

const VALID_TIMINGS = ["exploring", "within-1-month", "within-3-months", "later"];

const MAX_BODY_BYTES = 16_000;
const MAX_SERVICES = 12;

const AUDIENCE_LABELS: Record<string, string> = {
  consultant: "Independent consultant",
  practice: "Part of a consulting practice",
  other: "Other",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // --- Bound the request body size ---
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }

    const body = JSON.parse(rawText);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const organization = String(body.organization || "").trim();
    const audience = String(body.audience || "").trim();
    const rawServices = Array.isArray(body.services) ? body.services : [];
    const services = rawServices.slice(0, MAX_SERVICES).map((s: unknown) => String(s));
    const primaryService = String(body.service || "general").trim();
    const timing = body.timing ? String(body.timing).trim() : null;
    const profileUrl = body.profile_url ? String(body.profile_url).trim() : null;
    const message = String(body.message || "").trim();

    // --- Server-side validation ---
    const errors: string[] = [];
    if (!name) errors.push("Name is required.");
    if (!email) errors.push("Email is required.");
    else if (!validateEmail(email)) errors.push("Email is not valid.");
    if (!audience) errors.push("Audience is required.");
    if (name.length > 160) errors.push("Name is too long.");
    if (email.length > 254) errors.push("Email is too long.");
    if (organization.length > 200) errors.push("Organization is too long.");
    if (message.length > 3000) errors.push("Message is too long.");
    if (profileUrl && profileUrl.length > 500) errors.push("Website URL is too long.");

    const validAudiences = ["consultant", "practice", "other"];
    if (audience && !validAudiences.includes(audience)) {
      errors.push("Audience selection is not valid.");
    }

    // Validate each service value against the allowlist
    for (const svc of services) {
      if (!VALID_SERVICES.includes(svc)) {
        errors.push("One or more selected services are not valid.");
        break;
      }
    }

    // Validate primary service (defaults to "general")
    if (primaryService && !VALID_SERVICES.includes(primaryService)) {
      errors.push("Service selection is not valid.");
    }

    // Validate timing if provided
    if (timing && !VALID_TIMINGS.includes(timing)) {
      errors.push("Timing selection is not valid.");
    }

    if (errors.length > 0) {
      return json({ error: errors.join(" ") }, 400);
    }

    // --- Store in database ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: insertError } = await supabase
      .from("inquiries")
      .insert({
        name,
        email,
        organization: organization || null,
        audience,
        service: primaryService,
        services: services.length > 0 ? services : null,
        timing,
        profile_url: profileUrl,
        message: message || null,
      });

    if (insertError) {
      console.error("Database insert failed:", insertError.message);
      return json({ error: "We could not save your inquiry. Please try again." }, 500);
    }

    // --- Send owner notification via Resend ---
    let notificationFailed = false;
    let notificationError: string | null = null;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY secret is not set — notification skipped.");
      notificationFailed = true;
      notificationError = "Email notifications are not yet configured.";
    } else {
      const serviceList = services.length > 0
        ? services.map((s: string) => SERVICE_LABELS[s] || s).join(", ")
        : SERVICE_LABELS[primaryService] || primaryService;

      const timingLabel = timing ? (TIMING_LABELS[timing] || timing) : "Not specified";
      const audienceLabel = AUDIENCE_LABELS[audience] || audience;

      const html = `
        <h2>New Inquiry from ${escapeHtml(name)}</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Name:</td><td><strong>${escapeHtml(name)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Email:</td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Organization:</td><td>${escapeHtml(organization || "—")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Audience:</td><td>${escapeHtml(audienceLabel)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Interested in:</td><td>${escapeHtml(serviceList)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Timing:</td><td>${escapeHtml(timingLabel)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Website:</td><td>${escapeHtml(profileUrl || "—")}</td></tr>
        </table>
        <h3 style="font-family:sans-serif;font-size:14px;margin-top:16px;">Message</h3>
        <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;">${escapeHtml(message || "—")}</p>
        <hr style="margin-top:24px;border:none;border-top:1px solid #eee;">
        <p style="font-family:sans-serif;font-size:12px;color:#999;">This inquiry was submitted from the RegForward AI website.</p>
      `;

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [RESEND_TO],
            subject: `New inquiry from ${name}`,
            html,
          }),
        });

        if (!resendResponse.ok) {
          const errText = await resendResponse.text();
          console.error("Resend API error:", resendResponse.status, errText);
          notificationFailed = true;
          notificationError = "The email notification could not be sent.";
        }
      } catch (err) {
        console.error("Resend fetch failed:", err.message);
        notificationFailed = true;
        notificationError = "The email notification could not be sent.";
      }
    }

    return json({
      success: true,
      notification_failed: notificationFailed,
      notification_message: notificationError,
    }, 200);
  } catch (err) {
    console.error("Unhandled error:", err.message);
    return json({ error: "We could not process your inquiry. Please try again." }, 500);
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
