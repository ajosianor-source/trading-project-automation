# SignalForge / Exness Guard WhatsApp + SMS relay

This localhost-only service forwards SignalForge and Exness Guard alerts to
WhatsApp and optionally SMS through the official Twilio API. Twilio credentials
stay outside MT5 and outside the EAs.

## One-time setup

1. Activate the Twilio WhatsApp Sandbox.
2. From the receiving phone, send the displayed `join <sandbox-code>` message
   to Twilio's Sandbox number.
3. Copy `.env.example` to `.env`.
4. Enter the Twilio Account SID, Auth Token and receiving WhatsApp number in
   `.env`. Do not send the Auth Token in chat or commit `.env`.
5. Double-click `Start-WhatsAppRelay.cmd` and keep its window open.
6. In MT5, open **Tools > Options > Expert Advisors** and add:
   `http://127.0.0.1:8787`
7. Reattach `SignalForgeFX_v140` with `InpEnableWhatsApp=true`.
8. Double-click `Test-WhatsAppRelay.cmd` to send a test.

Use `InpWhatsAppTimeoutMs=10000` so a Twilio cold start does not time out the
EA's infrequent alert request.

## Important Sandbox limitation

Free-form messages are permitted during the 24-hour customer-service window
after the receiving phone messages the Sandbox. The Sandbox join expires after
three days. Production unattended alerts require a registered WhatsApp sender
and approved notification templates.

## SMS fallback

SMS is useful when WhatsApp Sandbox messages fail or expire. To enable SMS,
add these values to `.env`:

```env
TWILIO_SMS_FROM=+1xxxxxxxxxx
TWILIO_SMS_TO=+44xxxxxxxxxx
TWILIO_ALERT_CHANNELS=whatsapp,sms
```

`TWILIO_SMS_FROM` must be a Twilio SMS-capable phone number. If your Twilio
account is still in trial mode, the receiving phone number may need to be
verified in Twilio before SMS can be delivered.

The MT5 EA does not need a new URL. It still posts to:

`http://127.0.0.1:8787/alert`

The relay tries channels in `TWILIO_ALERT_CHANNELS` order. For example,
`whatsapp,sms` tries WhatsApp first and sends SMS if WhatsApp fails. Use `sms`
alone if you want SMS-only alerts.
