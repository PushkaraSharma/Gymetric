# WhatsApp Setup — New Gym Checklist

Everything needed to enable WhatsApp for one gym. Steps 1-6 are on Meta,
step 7 is in our database.

## 1. Meta app + WABA

- Create/use a Meta app (type: Business) at developers.facebook.com
- Add the **WhatsApp** product
- Attach a WhatsApp Business Account (WABA) and a phone number
- From WhatsApp → **API Setup**, note down:
  - `Phone number ID`
  - `WhatsApp Business Account ID` (WABA ID)

## 2. Permanent access token

Do NOT use the 24-hour temporary token.

- Business Settings → Users → **System Users** → add a system user (Admin)
- Assign the WABA as an asset to that system user
- Generate a token with: `whatsapp_business_messaging`,
  `whatsapp_business_management`
- Set no expiry. This is the `accessToken` we store.

## 3. Message templates

Create 4 templates, language **English (en)**. Header format matters —
a mismatch causes error 132012.

| Template name      | Header | Body params (in order)              |
| ------------------ | ------ | ----------------------------------- |
| `onboarding`       | IMAGE  | name, gym, plan, startDate, endDate |
| `renewal_complete` | TEXT   | name, plan, startDate, endDate      |
| `renewal`          | TEXT   | name, gym, daysRemaining, endDate   |
| `expired`          | TEXT   | name, gym, endDate                  |

TEXT headers receive the gym name. Wait for each template to be Approved.

## 4. Header image (onboarding only)

Upload the image and keep the returned id:

```bash
curl -X POST "https://graph.facebook.com/v22.0/<PHONE_NUMBER_ID>/media" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "messaging_product=whatsapp" \
  -F "type=image/jpeg" \
  -F "file=@header.jpg"
# -> {"id":"893040706795031"}
```

WARNING: media IDs expire after 30 days. After that, onboarding sends fail
with "Media ID ... does not exist or has expired" and the id must be
re-uploaded. Planned fix: send a permanent Cloudinary link instead.

## 5. Webhook

- WhatsApp → Configuration → Webhook → Edit
- Callback URL: `https://<api-host>/api/system/whatsapp-webhook`
- Verify token: value of `WHATSAPP_VERIFY_TOKEN` on the server
- Click **Verify and Save** (logs: `WhatsApp webhook verify ... tokenOk: true`)
- Webhook fields → subscribe **`messages`**
  (this carries both inbound messages and sent/delivered/read/failed statuses)
- Leave "Attach a client certificate" OFF

## 6. Subscribe the WABA to the app ← easy to miss

Verifying the URL is not enough. Without this, Meta never sends real events.
Meta's "Test" button still works, which makes this misleading to debug.

```bash
# check
curl "https://graph.facebook.com/v22.0/<WABA_ID>/subscribed_apps?access_token=<TOKEN>"

# subscribe (the app is inferred from the token — use the app that owns the webhook)
curl -X POST "https://graph.facebook.com/v22.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>"
```

`"data": []` means not subscribed. Needs `whatsapp_business_management`.

## 7. Save settings for the gym

In the `settings` collection, for that `gymId`:

```js
whatsapp: {
  accessToken:  "<permanent token>",
  phoneNumberId:"<phone number id>",
  headerImageId:"<media id from step 4>",
  active: true,
  reminderDays: 1,          // always 1, forced server-side
  sendOnOnboarding: true,
  sendOnRenewal: true,
  sendOnExpiry: true,
  sendOnReminder: true,
}
```

Helper script: `server/src/tests/checkWhatsApp.ts`

## 8. Verify end to end

1. Onboard a test client → WhatsApp arrives with the image header
2. Cloud Run logs show `WhatsApp webhook POST ... statuses: 1`
   then `WhatsApp webhook status updated`
3. App → Settings → WhatsApp Messages: row moves Queued → Sent →
   Delivered → Read

## Troubleshooting

| Symptom                                      | Cause                                      |
| -------------------------------------------- | ------------------------------------------ |
| No POST at all, but Meta's Test button works | WABA not subscribed (step 6)               |
| `132012` format mismatch                     | Header type differs from the template      |
| `Media ID ... has expired`                   | Re-upload the header image (step 4)        |
| Stuck on Queued                              | `messages` field not subscribed            |
| `no MessageLog for wamid` in logs            | Status arrived for a message we didn't log |

## Server env vars

- `WHATSAPP_VERIFY_TOKEN` — must match the value entered in step 5
- `WHATSAPP_APP_SECRET` — optional, enables X-Hub-Signature-256 checking

## Code reference

- Sending: `server/src/services/Whatsapp.ts` (Graph v22.0)
- Webhook: `server/src/controllers/whatsappController.ts`
- Routes: `server/src/routes/system.ts`
- Cron sends (expired / reminder): `server/src/controllers/systemController.ts`
