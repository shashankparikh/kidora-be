// Plain inline-styled HTML — email clients don't reliably support
// external/embedded stylesheets, so every rule lives on the element.
const NAVY = "#1b1f5c";
const GOLD = "#ffc93c";
const INK = "#3d4066";
const MUTED = "#6b6f94";

function layout({ heading, body, ctaLabel, ctaUrl, code }) {

    return `
<div style="background:#f5f6fc;padding:40px 16px;font-family:'Trebuchet MS','Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 14px 30px rgba(20,24,74,0.12);">
    <div style="background:${NAVY};padding:28px 32px;text-align:center;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;">📖 OopsyInk</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;color:${INK};font-size:22px;">${heading}</h1>
      <p style="margin:0 0 24px;color:${MUTED};font-size:15px;line-height:1.7;">${body}</p>
      ${
          code
              ? `<div style="margin:0 0 24px;padding:18px;border-radius:14px;background:#f5f6fc;text-align:center;"><span style="font-family:'Courier New',monospace;font-size:32px;font-weight:800;letter-spacing:10px;color:${NAVY};">${code}</span></div>`
              : ""
      }
      ${
          ctaUrl
              ? `<a href="${ctaUrl}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:${GOLD};color:${NAVY};font-weight:800;text-decoration:none;font-size:15px;">${ctaLabel}</a>`
              : ""
      }
    </div>
    <div style="padding:20px 32px;border-top:1px solid #ecedf8;text-align:center;">
      <span style="color:#9497b8;font-size:12.5px;">Made with love for young dreamers everywhere ✨</span>
    </div>
  </div>
</div>`;

}

// The code appears in the subject as well as the body. That is deliberate:
// it lets someone read it straight from a notification without opening the
// mail, which is what consumer apps do and what customers now expect. The
// trade is that it is visible on a lock screen — acceptable here, because
// anyone holding the unlocked-enough phone to read it can also open the
// inbox.
function loginCodeEmail({ code, minutes }) {

    return {
        subject: `${code} is your OopsyInk sign-in code`,
        html: layout({
            heading: "Here's your sign-in code",
            body: `Enter this code to sign in. It expires in ${minutes} minutes and can only be used once. If you didn't ask for it, you can safely ignore this email — nobody can sign in without it.`,
            code
        })
    };

}

// The preview is ready. Deliberately framed as an invitation to check the
// book rather than as a deadline — the window is real and has to be stated,
// but a parent opening this should feel looked after, not hurried.
function previewReadyEmail({ name, childName, previewUrl, hours }) {

    const who = childName ? `${childName}'s` : "your child's";

    return {
        subject: `${childName || "Your child"}'s book is ready to look at`,
        html: layout({
            heading: `Have a look at ${who} book`,
            body: `Hi ${name || "there"}, we've finished ${who} story and you can see it now. Take your time — if anything isn't quite right, a name, a page, a detail, just tell us and we'll change it. You have ${hours} hours before it goes to print.`,
            ctaLabel: "See The Preview",
            ctaUrl: previewUrl
        })
    };

}

// First nudge, at 24 hours. Assumes nothing about why they have not replied —
// most people are simply busy, and a book for their child is not urgent to
// anybody but us.
function previewNudgeEmail({ name, childName, previewUrl, hoursLeft }) {

    const who = childName ? `${childName}'s` : "your child's";

    return {
        subject: `${childName || "Your child"}'s book is waiting for you`,
        html: layout({
            heading: "Still here whenever you are",
            body: `Hi ${name || "there"}, ${who} book is ready and waiting. If everything looks good you don't need to do anything at all — and if you'd like something changed, there's still about ${hoursLeft} hours to tell us.`,
            ctaLabel: "See The Preview",
            ctaUrl: previewUrl
        })
    };

}

// Last nudge, at 48 hours. The only one that names the consequence, because
// by now it is genuinely useful information rather than pressure.
function previewFinalNudgeEmail({ name, childName, previewUrl, hoursLeft }) {

    const who = childName ? `${childName}'s` : "your child's";

    return {
        subject: `Printing ${childName || "your child"}'s book soon`,
        html: layout({
            heading: "One last look?",
            body: `Hi ${name || "there"}, we're about to send ${who} book to print. If you're happy, there's nothing to do — it'll be with you in 7 to 10 days. If you'd like anything changed, let us know in the next ${hoursLeft} hours or so and we'll sort it before it's printed.`,
            ctaLabel: "See The Preview",
            ctaUrl: previewUrl
        })
    };

}

function welcomeEmail({ name, appUrl }) {

    return {
        subject: "Welcome to OopsyInk ✨",
        html: layout({
            heading: `Welcome, ${name || "there"}!`,
            body: "Your OopsyInk account is ready. Turn your child into the hero of their very own illustrated storybook — built around their name, their personality, and the adventures they dream about.",
            ctaLabel: "Start Their Story",
            ctaUrl: `${appUrl}/personalize`
        })
    };

}

function storyReadyEmail({ name, childName, bookTitle, previewUrl }) {

    return {
        subject: `${childName ? `${childName}'s` : "Your"} storybook is ready! 🎉`,
        html: layout({
            heading: `${bookTitle || "Your story"} is ready to read!`,
            body: `Hi ${name || "there"}, the illustrations are in and ${childName ? `${childName}'s` : "your child's"} adventure is ready to explore. Read the first pages free, right now.`,
            ctaLabel: "Read The Story",
            ctaUrl: previewUrl
        })
    };

}

function newsletterConfirmationEmail({ appUrl }) {

    return {
        subject: "You're on the list! ✨",
        html: layout({
            heading: "You're subscribed!",
            body: "Thanks for signing up. We'll send you the occasional update on new story worlds, features, and offers — no spam, just magic.",
            ctaLabel: "Explore OopsyInk",
            ctaUrl: appUrl
        })
    };

}

// Internal operator notification, not the branded consumer layout() above
// — plain text is more useful for an ops alert than a marketing template.
function dailySpendCapAlert({ cap, date }) {

    return {
        subject: `⚠️ OopsyInk: daily AI generation cap reached (${cap}/day)`,
        html: `<p>The daily AI generation cap of <strong>${cap}</strong> calls was reached for <strong>${date}</strong> (UTC). Further character/story/illustration requests are being rejected until the cap resets at UTC midnight.</p><p>Raise AI_DAILY_GENERATION_CAP if this is expected traffic, or check for an abuse pattern if it isn't.</p>`
    };

}

module.exports = {
    welcomeEmail,
    previewReadyEmail,
    previewNudgeEmail,
    previewFinalNudgeEmail,
    loginCodeEmail,
    storyReadyEmail,
    newsletterConfirmationEmail,
    dailySpendCapAlert
};
