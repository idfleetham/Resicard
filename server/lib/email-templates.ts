// Every message Resicard sends, as a subject, an HTML body and a plain text
// alternative. Short, plain and in the brand voice.
//
// Two hard rules live here rather than in the provider: there is no tracking
// pixel and no wrapped link in any of these templates, so nothing reports back
// when a member opens or clicks. Anything added below must keep that true. The
// wordmark is set as text, not an image, so a client that blocks remote content
// still shows a complete message and there is nothing to load and count.

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export interface EmailBrand {
  /** Where links point, e.g. https://resicard.co.uk */
  baseUrl: string;
  /** The postal identity every message carries, as required of a sender. */
  postalAddress: string;
  /** Where a reply goes, used by the line telling people how to stop reminders. */
  replyTo: string;
  townName: string;
}

const SEA = "#0F3B47";
const SLATE = "#5C6F75";
const FOAM = "#F2F5F4";

/**
 * Reminders are about the member's own membership, but they are not strictly
 * transactional, so they say how to stop them. A reply reaches a person: there is
 * no one-click list to leave because there is no list, only your own membership.
 */
const STOP_LINE =
  "You are getting this because you hold a Resicard membership. To stop membership reminders, reply to this email and we will turn them off.";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function greeting(firstName?: string | null): string {
  return firstName?.trim() ? `Hello ${firstName.trim()},` : "Hello,";
}

/** "07 Sep 2026" */
export function formatEmailDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface Body {
  heading: string;
  /** Paragraphs, as plain text. Escaped on the way into the HTML. */
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Added under the postal address when the message is not strictly transactional. */
  stopLine?: string;
}

function renderHtml(brand: EmailBrand, body: Body): string {
  const paragraphs = body.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:${SEA};">${escapeHtml(p)}</p>`)
    .join("");
  const action = body.action
    ? `<p style="margin:0 0 20px;"><a href="${escapeHtml(body.action.url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${SEA};color:${FOAM};font-weight:700;text-decoration:none;">${escapeHtml(body.action.label)}</a></p>`
    : "";
  const stop = body.stopLine
    ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:${SLATE};">${escapeHtml(body.stopLine)}</p>`
    : "";
  return [
    `<div style="margin:0;padding:24px;background:${FOAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">`,
    `<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">`,
    `<p style="margin:0 0 20px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${SEA};">Resicard</p>`,
    `<h1 style="margin:0 0 14px;font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${SEA};">${escapeHtml(body.heading)}</h1>`,
    paragraphs,
    action,
    `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #E6E9E8;font-size:12px;line-height:1.5;color:${SLATE};">${escapeHtml(brand.postalAddress)}</p>`,
    stop,
    `</div></div>`,
  ].join("");
}

function renderText(brand: EmailBrand, body: Body): string {
  const lines = ["Resicard", "", body.heading, "", ...body.paragraphs.flatMap((p) => [p, ""])];
  if (body.action) lines.push(`${body.action.label}: ${body.action.url}`, "");
  lines.push("--", brand.postalAddress);
  if (body.stopLine) lines.push("", body.stopLine);
  return lines.join("\n");
}

function message(brand: EmailBrand, subject: string, body: Body): EmailMessage {
  return { subject, html: renderHtml(brand, body), text: renderText(brand, body) };
}

// ---------------------------------------------------------------------------
// Transactional: sent because the member did something.
// ---------------------------------------------------------------------------

export function passwordResetEmail(brand: EmailBrand, resetUrl: string, firstName?: string | null): EmailMessage {
  return message(brand, "Reset your Resicard password", {
    heading: "Reset your password",
    paragraphs: [
      greeting(firstName),
      "Use the link below to set a new password. It works once and expires in 30 minutes.",
      "If you did not ask for this, ignore this email. Your password stays as it is.",
    ],
    action: { label: "Set a new password", url: resetUrl },
  });
}

export function welcomeEmail(brand: EmailBrand, firstName?: string | null): EmailMessage {
  return message(brand, `Welcome to Resicard`, {
    heading: `Welcome to Resicard`,
    paragraphs: [
      greeting(firstName),
      `Your account is set up. Next we post a card with a code to your address to confirm you live in ${brand.townName}, then you pay the annual membership.`,
      "You can browse offers straight away.",
    ],
    action: { label: "Open Resicard", url: `${brand.baseUrl}/resident` },
  });
}

export function postcardPostedEmail(brand: EmailBrand, firstName?: string | null, expiresAt?: Date | string | null): EmailMessage {
  const paragraphs = [
    greeting(firstName),
    "Your postcard is in the post. It carries a six-character code.",
    "When it arrives, enter the code on your Resicard card tab and your address is confirmed.",
  ];
  if (expiresAt) paragraphs.push(`The code works until ${formatEmailDate(expiresAt)}.`);
  return message(brand, "Your postcard is on its way", {
    heading: "Your postcard is on its way",
    paragraphs,
    action: { label: "Enter your code", url: `${brand.baseUrl}/resident` },
  });
}

export function verifiedEmail(brand: EmailBrand, firstName?: string | null): EmailMessage {
  return message(brand, "Your address is verified", {
    heading: "Your address is verified",
    paragraphs: [
      greeting(firstName),
      `You are confirmed as living in ${brand.townName}. Your Resicard is ready to use at any participating outlet.`,
      "Scan the code at the till, pick an offer, and show the green screen to staff.",
    ],
    action: { label: "See what is on", url: `${brand.baseUrl}/resident?tab=offers` },
  });
}

export function merchantApprovedEmail(brand: EmailBrand, businessName: string, firstName?: string | null): EmailMessage {
  return message(brand, "Your Resicard listing is approved", {
    heading: "You are listed on Resicard",
    paragraphs: [
      greeting(firstName),
      `${businessName} has been approved. You can add offers and print your scan code now.`,
      "Residents see your outlet as soon as an offer goes live.",
    ],
    action: { label: "Set up your offers", url: `${brand.baseUrl}/merchant` },
  });
}

// ---------------------------------------------------------------------------
// Membership reminders: sent by the daily job, and carrying the stop line.
// ---------------------------------------------------------------------------

export function trialEndingEmail(brand: EmailBrand, chargeDate: Date | string, firstName?: string | null): EmailMessage {
  return message(brand, "Your Resicard trial ends in a week", {
    heading: "Your trial ends in a week",
    paragraphs: [
      greeting(firstName),
      `Your free trial runs until ${formatEmailDate(chargeDate)}. On that day your annual membership starts and the card you gave us is charged.`,
      "If you would rather not carry on, cancel before then and you will not be charged.",
    ],
    action: { label: "Check your membership", url: `${brand.baseUrl}/resident` },
    stopLine: STOP_LINE,
  });
}

export function renewalReminderEmail(brand: EmailBrand, days: number, expiry: Date | string, firstName?: string | null): EmailMessage {
  const when = days === 30 ? "next month" : "next week";
  return message(brand, `Your Resicard renews ${when}`, {
    heading: `Your membership renews ${when}`,
    paragraphs: [
      greeting(firstName),
      `Your Resicard membership runs until ${formatEmailDate(expiry)} and renews for another year on that date.`,
      "Nothing to do if you are staying. If you would rather not renew, you can turn renewal off in the app.",
    ],
    action: { label: "Check your membership", url: `${brand.baseUrl}/resident` },
    stopLine: STOP_LINE,
  });
}

export function membershipLapsedEmail(brand: EmailBrand, expiry: Date | string, firstName?: string | null): EmailMessage {
  return message(brand, "Your Resicard membership has ended", {
    heading: "Your membership has ended",
    paragraphs: [
      greeting(firstName),
      `Your membership ran out on ${formatEmailDate(expiry)}, so offers at the till are no longer open to you.`,
      "You can start again whenever you like. Your address stays verified, so it takes a minute.",
    ],
    action: { label: "Start again", url: `${brand.baseUrl}/resident` },
    stopLine: STOP_LINE,
  });
}

/**
 * Points about to lapse at one outlet.
 *
 * Deliberately not a marketing email: it is told plainly, it names the outlet and
 * the date, and it does not suggest anything to spend the points on. A warning
 * that reads as a promotion is the thing that makes people distrust the scheme
 * that sent it.
 */
export function pointsExpiringEmail(
  brand: EmailBrand,
  outletName: string,
  points: number,
  expiresAt: Date | string,
  firstName?: string | null,
): EmailMessage {
  return message(brand, `Your points at ${outletName} expire on ${formatEmailDate(expiresAt)}`, {
    heading: "Some points are about to run out",
    paragraphs: [
      greeting(firstName),
      `You have ${points.toLocaleString("en-GB")} points at ${outletName}, and they expire on ${formatEmailDate(expiresAt)} because it has been a while since you were last in.`,
      "Any visit resets the clock. Earn or spend a single point and the date moves out again.",
    ],
    action: { label: "See your cards", url: `${brand.baseUrl}/resident` },
    stopLine: STOP_LINE,
  });
}

// ---------------------------------------------------------------------------
// Marketing: sent because an outlet asked us to, to people who opted in.
// ---------------------------------------------------------------------------

/**
 * An outlet telling members what is on. The unsubscribe URL is required rather
 * than optional: a marketing email without a working one-click opt-out must not
 * leave the building, so the type makes it impossible to forget.
 */
export function campaignEmail(
  brand: EmailBrand,
  campaign: {
    merchantName: string;
    offerTitle: string;
    body: string;
    offerUrl: string;
    unsubscribeUrl: string;
  },
  firstName?: string | null,
): EmailMessage {
  const hello = firstName ? `${firstName}, ` : "";
  return message(brand, `${campaign.merchantName}: ${campaign.offerTitle}`, {
    heading: campaign.merchantName,
    paragraphs: [`${hello}${campaign.body}`, `The offer is "${campaign.offerTitle}". Scan the Resicard code at the till to use it.`],
    action: { label: "See the offer", url: campaign.offerUrl },
    stopLine: `You are getting this because you asked ${brand.townName} outlets to email you about offers. Stop at any time: ${campaign.unsubscribeUrl}`,
  });
}
