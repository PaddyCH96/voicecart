# Privacy Policy

**VoiceCart** ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and mobile application (collectively, the "Service").

---

## 1. Information We Collect

### 1.1 Information You Provide Directly

- **Account Information**: Phone number, email address, and password (hashed) when you register
- **Voice Recordings**: Audio files you upload or record through the Service
- **Profile Information**: Name, profile picture, and any other information you add to your account
- **Payment Information**: Managed by Razorpay. We do not store credit card or bank details

### 1.2 Information Collected Automatically

- **Usage Data**: Pages visited, features used, time spent, click patterns
- **Device Information**: Device type, operating system, browser type, IP address
- **Audio Processing Metadata**: Processing status, timestamps, language settings

### 1.3 Information from Third Parties

- **Razorpay**: Payment confirmation and subscription status
- **MSG91**: OTP delivery confirmation (phone number only — we don't access their full SMS logs)
- **OpenAI**: Processing confirmation for transcription (no content stored by OpenAI)
- **ElevenLabs**: Voice synthesis confirmation (no audio stored by ElevenLabs)
- **Cloudinary**: Media storage confirmation (upload/delivery URLs only)

---

## 2. How We Use Your Information

- Provide, maintain, and improve the Service
- Process audio recordings and generate marketing content
- Manage your account and process payments
- Send OTP codes for authentication
- Send service-related notifications (processing complete, subscription renewals)
- Respond to your requests, comments, or questions
- Monitor the performance and security of the Service
- Detect, prevent, and address technical issues or unauthorized use

---

## 3. Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Audio recordings (raw) | 7 days after processing | Automatic deletion from Cloudinary |
| Transcripts | Until account deletion | Manual deletion on request |
| Generated marketing text | Until account deletion | Manual deletion on request |
| Account data (name, email, phone) | Until account deletion | Permanent deletion from PostgreSQL |
| Payment records | 8 years (Indian tax law) | Archived, not accessible in-app |
| API logs | 90 days | Automatic rotation |

You may request deletion of your account and all associated data at any time by emailing support@voicecart.app. We will process deletion requests within 30 days.

---

## 4. Data Sharing

We do **not** sell, rent, or trade your personal information to third parties for marketing purposes.

We share data only in these circumstances:

- **Service Providers**: Cloudinary (media storage), OpenAI (transcription), ElevenLabs (voice synthesis), Razorpay (payments), MSG91 (OTP SMS). These providers process your data only to deliver the specific service you've requested.
- **Legal Requirements**: When required by law, court order, or to protect our legal rights.
- **Business Transfer**: In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.

---

## 5. Data Security

We implement industry-standard security measures:

- **Encryption in transit**: HTTPS/TLS on all connections
- **Encryption at rest**: Database-level encryption (handled by PostgreSQL provider)
- **Access controls**: Role-based access, minimal privilege principle
- **Secure authentication**: JWT tokens with httpOnly cookies, OTP with timing-safe comparison
- **Payment security**: Razorpay handles all card/bank data; PCI DSS compliance managed by Razorpay

No security measure is 100% impenetrable. We cannot guarantee absolute security but we continuously improve our practices.

---

## 6. Your Rights

### For Users in India (DPDP Act Compliance)

Under the Digital Personal Data Protection (DPDP) Act, 2023, you have the right to:

- **Know** what personal data we collect and how it's used
- **Correct** inaccurate or incomplete personal data
- **Erase** your personal data (subject to legal retention requirements)
- **Port** your data in a machine-readable format
- **Withdraw consent** for data processing (may affect Service functionality)
- **Grievance Redressal**: File complaints with our Data Protection Officer

### For Users in the European Economic Area (GDPR)

If you are located in the EEA, you have additional rights under GDPR including the right to restrict processing and object to processing.

### For All Users

- Access your data by logging into your account settings
- Update or correct your profile information at any time
- Delete your account via Settings → Delete Account
- Opt out of non-essential communications by contacting us
- Request a copy of your data by emailing privacy@voicecart.app

---

## 7. Cookies

We use the following cookies:

| Cookie | Type | Purpose | Expiry |
|--------|------|---------|--------|
| `__Host-vc_token` | Essential | JWT authentication (httpOnly, secure, sameSite=strict) | 30 days |
| `vc_token` | Essential | Legacy auth cookie for backward compatibility | 30 days |

We do not use advertising or tracking cookies.

---

## 8. Children's Privacy

The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If you become aware that a child has provided us with personal information, please contact us at privacy@voicecart.app and we will promptly delete such data.

---

## 9. International Data Transfers

Our servers are located in India and the United States. By using the Service, you consent to your data being transferred to and processed in these jurisdictions, which may have different data protection laws than your country.

For users in the EEA: Any international data transfers are conducted under appropriate safeguards (Standard Contractual Clauses or adequacy decisions).

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by:

- Posting the updated policy on this page
- Updating the "Last updated" date above
- Sending an email notification for significant changes
- Displaying a notice in the Service for 30 days

Your continued use of the Service after any changes constitutes acceptance of the updated policy.

---

## 11. Contact Us

For privacy-related questions, data deletion requests, or grievances:

**Email**: privacy@voicecart.app
**Address**: Hyderabad, Telangana, India

We aim to respond to all requests within 30 days.

---

*Last updated: July 2026*