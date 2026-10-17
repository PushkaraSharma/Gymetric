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

## 4. Permanent header image (onboarding only)

Upload the JPEG/PNG to Cloudinary (Media Library → Upload), then copy its
public HTTPS delivery URL. It should look like:

```text
https://res.cloudinary.com/<cloud-name>/image/upload/v123/gymetric/whatsapp/onboarding.jpg
```

Open that URL in an incognito browser window before saving it. Meta must be
able to download it without authentication. Store it as `headerImageUrl`.

Gymetric sends this URL directly in the WhatsApp image header, so it does not
expire after 30 days. Keep the Cloudinary asset public and do not delete or
rename it. WhatsApp stays off until this URL is saved. Stored Meta media IDs
are not used.

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
  headerImageUrl:"https://res.cloudinary.com/.../onboarding.jpg",
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
| `Media ID ... has expired`                   | Set `headerImageUrl`; old ID is being used |
| Header image cannot be downloaded            | URL is private, moved, or not direct HTTPS |
| Stuck on Queued                              | `messages` field not subscribed            |
| `no MessageLog for wamid` in logs            | Status arrived for a message we didn't log |

## Server env vars

- `WHATSAPP_VERIFY_TOKEN` — must match the value entered in step 5
- `WHATSAPP_APP_SECRET` — optional, enables X-Hub-Signature-256 checking
- `WHATSAPP_IMAGE_URL` — permanent public onboarding image URL, used by the
  WhatsApp settings helper script

## Code reference

- Sending: `server/src/services/Whatsapp.ts` (Graph v22.0)
- Webhook: `server/src/controllers/whatsappController.ts`
- Routes: `server/src/routes/system.ts`
- Cron sends (expired / reminder): `server/src/controllers/systemController.ts`
