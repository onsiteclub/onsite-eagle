# Privacy Policy

**Last updated: April 2026**

OnSite Calculator ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and web service.

## Information We Collect

### Account Information (only if you sign up)
Most of the calculator works without an account. If you choose to create one, we collect:
- Email address
- First and last name
- Trade/profession (optional)
- Birthday (optional)
- Gender (optional)

### Anonymous Device Identifier
Whether or not you sign in, the app generates a random device ID on first launch. This is stored on your device and sent with API requests. We use it for:
- Rate limiting (preventing abuse)
- Linking your calculations on this device when you don't have an account
- Counting how many calculations were made from your device (for your own review in the Privacy Dashboard)

No personally identifiable information is embedded in the device ID — it's just a random UUID.

### Usage Data
We automatically collect:
- App usage analytics (calculations performed, features used)
- Device information (OS version, device model)
- IP address (for rate limiting and security)
- Error logs for debugging

### Voice Data
When you use the voice feature:
- Audio is uploaded to our API, transcribed, and **not retained on our servers**
- **Audio is sent to OpenAI (United States)** for transcription via Whisper and interpretation via GPT-4. This is an international transfer of data — see "International Transfers" below.
- Transcribed text is stored **only if you opted in to the separate "help improve voice recognition" consent** (default: off).

## How We Use Your Information

- **Provide the service** — Process calculations, sync data across devices
- **Authentication** — Manage your account and subscription
- **Improve the app** — Analyze usage patterns, fix bugs; train future voice models on consented data
- **Communication** — Send service updates, respond to support requests

## Data Storage and Security

- Your data is stored securely using Supabase (cloud infrastructure, Canadian-hosted region where available)
- We use encryption in transit (HTTPS / TLS 1.2+) and at rest
- Voice audio is processed by OpenAI and **not retained by us**; OpenAI's retention policy applies during transit
- Keystores, API keys, and secrets are never committed to source code

## International Transfers

The voice feature depends on OpenAI's Whisper + GPT-4 APIs. These services are operated from the United States. When you use voice input:
- Your audio is transmitted to OpenAI (US) over HTTPS
- OpenAI processes it transiently and returns a text result
- **We do not control OpenAI's retention** — see [OpenAI's privacy policy](https://openai.com/policies/privacy-policy). Per OpenAI's enterprise terms, audio submitted via their API is not used to train their models.

If you do not consent to this transfer, **do not use the voice feature** — the typed-keyboard calculator works entirely within the app and does not send data to OpenAI.

## Third-Party Services

| Service | Purpose | Jurisdiction |
|---------|---------|--------------|
| **Supabase** | Authentication, database, object storage | Configurable per region (we use CA where available) |
| **OpenAI** | Voice transcription (Whisper) + interpretation (GPT-4) | United States |
| **Stripe** | Payment processing (subscriptions) | United States |
| **Vercel** | Web hosting and API edge runtime | United States |
| **Upstash** | Rate-limit backing store (optional, may not be enabled) | Multi-region |

Each service has its own privacy policy governing their data practices.

## Your Rights

You have the right to:
- **Access** your personal data
- **Correct** inaccurate data
- **Delete** your account and data (see the in-app **Privacy Dashboard** → "Delete my data" button, or email us)
- **Export** your calculation history (see the in-app **Exportar** button in the conversation view)
- **Opt out** of analytics and voice training independently
- **Withdraw consent** for the microphone or voice-training features at any time via the Privacy Dashboard

To exercise these rights, open the app's Privacy Dashboard (☰ menu → Privacy) or contact us at privacy@onsiteclub.ca. We respond within 30 days.

## In-App Privacy Controls

The Privacy Dashboard inside the app lets you:
1. See which consents are currently granted on this device (microphone, voice training)
2. Revoke any consent with one tap — takes effect immediately
3. See a count of voice recordings, calculations, and error events linked to your device
4. Delete all data associated with this device via the `/api/privacy/delete` endpoint — deletion is immediate on the server; local history is wiped the same moment

## Data Retention

- **Account data** — retained while your account is active; purged within 30 days of account deletion
- **Calculation history** (`ccl_calculations`) — 90 days, or until you delete via Privacy Dashboard
- **Voice recordings** — never retained after processing (audio is streamed to OpenAI and discarded)
- **Voice transcriptions** (`core_voice_logs`, only if consented) — 90 days, or until you delete
- **Error logs** (`log_errors`) — 30 days
- **Event logs** (`log_events`) — 30 days
- **Consent records** — 7 years (legal requirement under PIPEDA and LGPD)
- **Deleted accounts** — purged within 30 days

## Children's Privacy

OnSite Calculator is not intended for users under 16 years of age. We do not knowingly collect personal data from children under 16. If you believe we have collected data from a child, please contact us immediately at privacy@onsiteclub.ca.

## Changes to This Policy

We may update this policy periodically. We will notify you of significant changes via email or in-app notification.

## Contact Us

For privacy questions or concerns:

**OnSite Club Inc.**
3100 New Orchard Ave North
Ottawa, ON K2B 5E7
Canada

Email: privacy@onsiteclub.ca
Website: https://onsiteclub.ca

---

## Permissions Used

### Microphone
- **Purpose**: Voice input for hands-free calculations
- **When used**: Only when you press and hold the voice button
- **Data handling**: Audio is processed in real-time and not stored

### Internet
- **Purpose**: Sync data, process voice commands, authenticate
- **When used**: Throughout app operation
- **Data handling**: All transmissions are encrypted

---

---

## International Users

### For Users in the European Economic Area (EEA)
Under the General Data Protection Regulation (GDPR), you have additional rights including the right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data.

### For Users in Brazil
Under the Lei Geral de Proteção de Dados (LGPD), you have the right to confirmation of processing, access to data, correction, anonymization, portability, deletion, and information about sharing with third parties. Our legal basis for processing is consent and legitimate interest.

### For Users in California
Under the California Consumer Privacy Act (CCPA), you have the right to know what personal information is collected, request deletion, and opt-out of the sale of personal information. We do not sell your personal information.

### For Users in Canada
We comply with the Personal Information Protection and Electronic Documents Act (PIPEDA) and provincial privacy laws.

---

*This privacy policy is provided in compliance with Google Play Store and Apple App Store requirements, as well as applicable privacy laws including GDPR, LGPD, CCPA, and PIPEDA.*
