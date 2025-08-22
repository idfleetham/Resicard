# Resicard St Andrews - Community Deals Platform

A full-stack web application connecting verified local residents with exclusive deals from restaurants, bars, cafes, and businesses in the St Andrews community.

## Features

- **Role-based Authentication**: Separate portals for residents, merchants, and administrators
- **Digital Voucher System**: QR code generation and scanning for deal redemption
- **Loyalty Program Management**: Points, tiers, and rewards system for merchants
- **Apple Wallet Integration**: Add digital passes without requiring an App Store app
- **Customer Privacy Protection**: Anonymized customer data in merchant views
- **Reservation Integration**: Support for major reservation providers

## Apple Wallet Pass Distribution

### Overview

The platform includes Apple Wallet pass distribution functionality without requiring an App Store app. Users can add their Resicard directly to Apple Wallet for easy access to deals and loyalty information.

### Setup Requirements

To enable Apple Wallet pass generation, you need the following environment variables:

```bash
# Required - Apple Developer Account Information
PASS_TYPE_IDENTIFIER=pass.com.yourcompany.resicard
TEAM_IDENTIFIER=YOUR_APPLE_TEAM_ID

# Required - Pass Signing Certificates (Base64 encoded)
PASS_SIGNING_CERT_P12=<base64_encoded_p12_certificate>
PASS_SIGNING_CERT_PASSWORD=<p12_certificate_password>
WWDR_CERT=<base64_encoded_wwdr_certificate>
```

### Certificate Setup

1. **Apple Developer Account**: You need an active Apple Developer Program membership
2. **Pass Type ID**: Create a Pass Type ID in your Apple Developer account
3. **Signing Certificate**: Generate a Pass Type ID certificate (.p12 file)
4. **WWDR Certificate**: Download the Apple Worldwide Developer Relations certificate

### Without Apple Developer Certificates

If you don't have Apple Developer certificates, you have several options:

1. **Third-party Pass Issuers**: Integrate with services like:
   - PassSlot
   - Bepass
   - Passcreator
   - Urban Airship (Airship)

2. **API Integration**: Replace the signing step in `server/passkit.ts` with API calls to your chosen provider:

```javascript
// Instead of local signing, make API call to pass issuer
const response = await fetch('https://api.passvendor.com/passes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PASS_VENDOR_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(passData)
});
```

### Usage

1. **Visit Add Page**: Navigate to `/wallet/add` on any iOS device
2. **Add to Wallet**: Tap the "Add to Apple Wallet" button
3. **QR Code**: Alternatively, scan the QR code with iPhone camera
4. **Automatic Updates**: Pass updates automatically when loyalty points or tier changes

### Technical Implementation

- **Pass Generation**: Server-side pass generation with proper manifest and signature
- **Update Registration**: Endpoints for device registration and pass updates
- **Security**: Cryptographically signed passes with authentication tokens
- **Privacy**: No sensitive user data stored in passes

### API Endpoints

```
GET  /wallet/resicard.pkpass                              - Download signed pass
POST /api/wallet/v1/devices/.../registrations/...        - Register for updates
GET  /api/wallet/v1/devices/.../registrations/...        - Check for updates
GET  /api/wallet/v1/passes/...                           - Get updated pass
POST /api/wallet/v1/log                                  - Wallet app logging
```

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Apple Developer account (for Wallet passes)

### Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://...

# JWT Secret
JWT_SECRET=your-secret-key

# Apple Wallet (optional)
PASS_TYPE_IDENTIFIER=pass.com.yourcompany.resicard
TEAM_IDENTIFIER=YOUR_TEAM_ID
PASS_SIGNING_CERT_P12=base64_certificate
PASS_SIGNING_CERT_PASSWORD=certificate_password
WWDR_CERT=base64_wwdr_certificate

# Stripe (optional)
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...
```

### Installation

```bash
npm install
npm run db:push
npm run dev
```

### Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT with role-based access
- **Payments**: Stripe integration
- **Wallet**: Apple PassKit integration

## License

MIT License - see LICENSE file for details.