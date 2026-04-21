# Email audit — mobile side

**Scope:** all code paths in `cultivai-mobile/` that could send email.
**Policy (Part C of mobile-ops-sync):** every email must route through the
backend at `POST /api/integrations/email/send`. No direct Resend / SMTP /
SendGrid / Postmark / Mailgun / AWS SES clients may be imported from mobile.

## Findings

Ran the following searches (2026-04-21):

```
# Source code
grep -r 'resend\|sendgrid\|mailgun\|nodemailer\|postmark\|ses-client\|\.sendEmail\|@aws-sdk/client-ses\|smtp' src/ public/

# Dependencies
grep -iE 'resend|sendgrid|mailgun|nodemailer|postmark' package.json
```

**Result: zero matches.** Mobile has never imported an email SDK and has no
client-side code path that sends email. All auth flows (login, password reset
if added later) go through the backend's `authApi` endpoints, which handle
email server-side via `app/services/email_service.py` (Resend primary, SMTP
fallback).

## Call sites that *could* trigger server-side email

| Client call | Backend route | Email side-effect |
|-------------|---------------|-------------------|
| `authApi.login` | `/auth/login` | None — token response only |
| `scheduleApi.requestTimeOff` | `/schedule/time-off` | Manager notification (server-side, via `/integrations/email/send`) |
| `teamApi.createAnnouncement` | `/team/announcements` | Digest email (server-side, opt-in) |
| `broadcastApi.send` *(new)* | `/mobile/broadcast` | If `channel` includes `inbox` and user prefers email, server-side |

None of these expose email configuration or recipient lists to the client.

## Ongoing rule

Before any new client → server endpoint is added that triggers an email:

1. The backend must call `email_service.send(...)` — never a raw SDK.
2. The mobile side only sees a boolean success/failure and any `EmailLog.id`
   the backend chooses to echo back.
3. If a future mobile screen needs to show email-send status (e.g., "invitation
   email sent"), it reads that status from the backend's `EmailLog` via a
   dedicated status endpoint — not by making the call itself.

## Verification in compatibility pass

Scenario #7 of the compat checklist exercises this end-to-end:

> Trigger any mobile email path (password reset is easiest). Check `EmailLog`
> has the row and `provider` matches tenant's Resend/SMTP config.

Log the `EmailLog.id`, `provider`, and recipient in `QA_REPORT_2026-04-<date>.md`
when the pass runs.

## Sign-off

Mobile side is clean as of `branch/mobile-ops-sync` HEAD. No action required
beyond maintaining the rule above for future work.
