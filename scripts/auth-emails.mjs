// Firebase Auth email templates (verification + password reset), English and German in one mail.
//   node scripts/auth-emails.mjs preview [outDir]   → writes the HTML files to look at
//   node scripts/auth-emails.mjs console [outDir]   → the values to paste into Firebase console → Authentication → Templates
//   node scripts/auth-emails.mjs push               → uploads them and points the links at /auth/action
// Push needs an account with access to the project: GCLOUD_ACCOUNT=you@example.com (default: gcloud's active one).
// Projects without Identity Platform get EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED from the API; use `console` then.
// Firebase fills in %LINK%, %EMAIL% and %APP_NAME%. One template per kind: custom templates have no per-language variants.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PROJECT = process.env.PROJECT_ID ?? 'compile-tracker-cln';
const ORIGIN = (process.env.ORIGIN ?? 'https://compile.randomapps.net').replace(/\/$/, '');

const C = {
  bg: '#0d0a13',
  card: '#16111f',
  line: '#a44bd3',
  lineDim: '#3b2450',
  accent: '#c955ee',
  accentStrong: '#e07bff',
  text: '#efe9f7',
  muted: '#a393bd',
  dim: '#6e6283',
};
const SANS = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace";

const p = (html, extra = '') => `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.text};${extra}">${html}</p>`;
const small = (html) => `<p style="margin:0 0 10px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.muted};">${html}</p>`;
const kicker = (text) =>
  `<p style="margin:0 0 10px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.accentStrong};">&gt; ${text}</p>`;
const heading = (text) =>
  `<h1 style="margin:0 0 16px;font-family:${SANS};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:0.5px;color:${C.text};">${text}</h1>`;
const button = (label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">
  <tr><td bgcolor="${C.accent}" style="background:${C.accent};border-radius:2px;">
    <a href="%LINK%" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#13081b;text-decoration:none;">${label}</a>
  </td></tr>
</table>`;
const divider = `<tr><td style="padding:0 32px;"><div style="height:1px;line-height:1px;font-size:1px;background:${C.lineDim};">&nbsp;</div></td></tr>`;

function section({ lang, kick, title, body, cta, after }) {
  return `
<tr><td lang="${lang}" style="padding:28px 32px 14px;">
  ${kicker(kick)}
  ${heading(title)}
  ${body.map((b) => p(b)).join('')}
  ${button(cta)}
  ${after.map(small).join('')}
</td></tr>`;
}

function layout({ preheader, sections, fallback }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Compile Tracker</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
    <tr><td style="padding:0 4px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:12px;"><img src="${ORIGIN}/pwa-192.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:4px;"></td>
        <td style="font-family:${SANS};font-size:15px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${C.text};">Compile&nbsp;Tracker</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-top:3px solid ${C.accent};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${sections.join(divider)}
        <tr><td style="padding:6px 32px 26px;">
          <p style="margin:0 0 6px;font-family:${MONO};font-size:11px;line-height:1.5;color:${C.dim};">${fallback}</p>
          <p style="margin:0;font-family:${MONO};font-size:11px;line-height:1.5;word-break:break-all;"><a href="%LINK%" style="color:${C.accentStrong};text-decoration:underline;">%LINK%</a></p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.dim};">
      Compile Tracker · <a href="${ORIGIN}" style="color:${C.muted};">${ORIGIN.replace(/^https?:\/\//, '')}</a><br>
      An unofficial fan app for the card game Compile. · Eine inoffizielle Fan-App zum Kartenspiel Compile.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

const TEMPLATES = {
  verifyEmailTemplate: {
    subject: 'Confirm your email · E-Mail bestätigen — Compile Tracker',
    body: layout({
      preheader: 'One click to unlock friends and shared games. · Ein Klick, um Freunde und geteilte Spiele freizuschalten.',
      fallback: 'Button not working? Open this link: · Button funktioniert nicht? Öffne diesen Link:',
      sections: [
        section({
          lang: 'en',
          kick: 'confirm email',
          title: 'Confirm your email address',
          body: [
            'You created a Compile Tracker account with <strong style="color:#efe9f7;">%EMAIL%</strong>.',
            'Confirm the address to pick a handle, add friends and share recorded games with them.',
          ],
          cta: 'Confirm email',
          after: ['Didn’t sign up? Ignore this email; nothing happens without the confirmation.'],
        }),
        section({
          lang: 'de',
          kick: 'e-mail bestätigen',
          title: 'Bestätige deine E-Mail-Adresse',
          body: [
            'Du hast ein Compile-Tracker-Konto mit <strong style="color:#efe9f7;">%EMAIL%</strong> erstellt.',
            'Bestätige die Adresse, um ein Handle zu wählen, Freunde hinzuzufügen und erfasste Spiele mit ihnen zu teilen.',
          ],
          cta: 'E-Mail bestätigen',
          after: ['Du hast dich nicht registriert? Dann ignoriere diese E-Mail; ohne Bestätigung passiert nichts.'],
        }),
      ],
    }),
  },
  resetPasswordTemplate: {
    subject: 'Reset your password · Passwort zurücksetzen — Compile Tracker',
    body: layout({
      preheader: 'Set a new password for your account. · Lege ein neues Passwort für dein Konto fest.',
      fallback: 'Button not working? Open this link: · Button funktioniert nicht? Öffne diesen Link:',
      sections: [
        section({
          lang: 'en',
          kick: 'password reset',
          title: 'Set a new password',
          body: ['Someone asked to reset the password of the Compile Tracker account <strong style="color:#efe9f7;">%EMAIL%</strong>.'],
          cta: 'Choose new password',
          after: ['The link works once and expires after an hour. Didn’t ask for this? Ignore this email; your password stays as it is.'],
        }),
        section({
          lang: 'de',
          kick: 'passwort zurücksetzen',
          title: 'Lege ein neues Passwort fest',
          body: ['Für das Compile-Tracker-Konto <strong style="color:#efe9f7;">%EMAIL%</strong> wurde ein neues Passwort angefordert.'],
          cta: 'Neues Passwort wählen',
          after: ['Der Link funktioniert einmal und läuft nach einer Stunde ab. Nicht von dir angefordert? Ignoriere diese E-Mail; dein Passwort bleibt unverändert.'],
        }),
      ],
    }),
  },
};

const [cmd = 'preview', outDir = 'auth-emails-preview'] = process.argv.slice(2);

if (cmd === 'preview') {
  mkdirSync(outDir, { recursive: true });
  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    const html = tpl.body.replaceAll('%LINK%', `${ORIGIN}/auth/action?mode=preview&amp;oobCode=example`).replaceAll('%EMAIL%', 'ada@example.com');
    writeFileSync(`${outDir}/${name}.html`, html);
    console.log(`${outDir}/${name}.html  (${(tpl.body.length / 1024).toFixed(1)} KB)  ${tpl.subject}`);
  }
} else if (cmd === 'console') {
  mkdirSync(outDir, { recursive: true });
  console.log('Firebase console → Authentication → Templates. For each template: pencil icon, then\n');
  console.log(`  Sender name:        Compile Tracker`);
  console.log(`  Action URL:         ${ORIGIN}/auth/action   ("Customize action URL", same for all templates)\n`);
  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    writeFileSync(`${outDir}/${name}.body.html`, tpl.body);
    console.log(`  ${name === 'verifyEmailTemplate' ? 'Email address verification' : 'Password reset'}`);
    console.log(`    Subject:          ${tpl.subject}`);
    console.log(`    Message (if editable): ${outDir}/${name}.body.html\n`);
  }
} else if (cmd === 'push') {
  const account = process.env.GCLOUD_ACCOUNT;
  const token = execFileSync('gcloud', ['auth', 'print-access-token', ...(account ? [`--account=${account}`] : [])], { encoding: 'utf8' }).trim();
  const tpl = (t) => ({ senderDisplayName: 'Compile Tracker', subject: t.subject, body: t.body, bodyFormat: 'HTML', customized: true });
  const sendEmail = {
    callbackUri: `${ORIGIN}/auth/action`,
    verifyEmailTemplate: tpl(TEMPLATES.verifyEmailTemplate),
    resetPasswordTemplate: tpl(TEMPLATES.resetPasswordTemplate),
  };
  const mask = ['callbackUri', 'verifyEmailTemplate', 'resetPasswordTemplate'].map((k) => `notification.sendEmail.${k}`).join(',');
  const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'X-Goog-User-Project': PROJECT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification: { sendEmail } }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(JSON.stringify(json, null, 2));
    if (json.error?.message === 'EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED') console.error('\nThe API may not edit templates in this project; run `node scripts/auth-emails.mjs console` and set them in the Firebase console.');
    process.exit(1);
  }
  const se = json.notification.sendEmail;
  console.log('callbackUri:', se.callbackUri);
  for (const k of ['verifyEmailTemplate', 'resetPasswordTemplate']) console.log(`${k}: "${se[k].subject}" from ${se[k].senderDisplayName}, customized=${se[k].customized}`);
} else {
  console.error('usage: node scripts/auth-emails.mjs preview [outDir] | console [outDir] | push');
  process.exit(1);
}
