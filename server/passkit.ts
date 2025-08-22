import JSZip from 'jszip';
import forge from 'node-forge';
import crypto from 'crypto';
import { Response } from 'express';

interface PassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  generic: {
    primaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    auxiliaryFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    backFields: Array<{
      key: string;
      label: string;
      value: string;
    }>;
  };
  webServiceURL?: string;
  authenticationToken?: string;
  barcode?: {
    message: string;
    format: string;
    messageEncoding: string;
  };
}

interface UserData {
  id: number;
  username: string;
  email: string;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  memberSince?: string;
  merchantName?: string;
  offerTitle?: string;
  category?: string;
  expiryDate?: string;
  bookingUrl?: string;
  contactInfo?: string;
  logoUrl?: string;
}

export class PassKitService {
  private passTypeIdentifier: string;
  private teamIdentifier: string;
  private signingCert: string;
  private signingCertPassword: string;
  private wwdrCert: string;

  constructor() {
    this.passTypeIdentifier = process.env.PASS_TYPE_IDENTIFIER || '';
    this.teamIdentifier = process.env.TEAM_IDENTIFIER || '';
    this.signingCert = process.env.PASS_SIGNING_CERT_P12 || '';
    this.signingCertPassword = process.env.PASS_SIGNING_CERT_PASSWORD || '';
    this.wwdrCert = process.env.WWDR_CERT || '';

    if (!this.passTypeIdentifier || !this.teamIdentifier) {
      console.warn('Apple Wallet pass configuration incomplete. Set PASS_TYPE_IDENTIFIER and TEAM_IDENTIFIER environment variables.');
    }
  }

  generatePassData(user: UserData): PassData {
    const serialNumber = `resicard-${user.id}-${Date.now()}`;
    const merchantName = user.merchantName || "Resicard St Andrews";
    const currentDate = new Date().toLocaleDateString('en-GB');
    const memberSince = user.memberSince || currentDate;
    
    return {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeIdentifier,
      serialNumber,
      teamIdentifier: this.teamIdentifier,
      organizationName: merchantName,
      description: `${merchantName} - Community Card`,
      logoText: "Resicard",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(17, 24, 39)", // Dark theme background
      labelColor: "rgb(156, 163, 175)", // Neutral gray for labels
      generic: {
        primaryFields: [
          {
            key: "merchant",
            label: "Merchant",
            value: merchantName
          },
          {
            key: "cardType",
            label: "Card Type",
            value: "Resicard"
          }
        ],
        secondaryFields: [
          {
            key: "offer",
            label: "Current Offer",
            value: user.offerTitle || "Welcome Offer"
          },
          {
            key: "category",
            label: "Category",
            value: user.category || "Food & Drink"
          },
          {
            key: "expires",
            label: "Expires",
            value: user.expiryDate || "Never"
          }
        ],
        auxiliaryFields: [
          {
            key: "tier",
            label: "Tier",
            value: user.loyaltyTier || "Standard"
          },
          {
            key: "points",
            label: "Points",
            value: (user.loyaltyPoints || 0).toString()
          },
          {
            key: "memberSince",
            label: "Member Since",
            value: memberSince
          }
        ],
        backFields: [
          ...(user.bookingUrl ? [{
            key: "booking",
            label: "Make Reservation",
            value: user.bookingUrl
          }] : []),
          {
            key: "terms",
            label: "Terms & Conditions",
            value: "Present this pass to redeem offers. Cannot be combined with other offers. Valid for verified residents only. Subject to availability."
          },
          {
            key: "contact",
            label: "Contact & Support",
            value: user.contactInfo || "Email: support@resicard.co.uk\nPhone: +44 1334 123456\nWebsite: resicard.co.uk"
          },
          {
            key: "social",
            label: "Follow Us",
            value: "Instagram: @resicardstandrews\nFacebook: Resicard St Andrews\nTwitter: @resicard"
          }
        ]
      },
      webServiceURL: process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        "https://your-domain.replit.app",
      authenticationToken: this.generateAuthToken(user.id, serialNumber),
      barcode: {
        message: `RESICARD:${user.id}:${serialNumber}`,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      }
    };
  }

  private generateAuthToken(userId: number, serialNumber: string): string {
    const payload = { userId, serialNumber, iat: Date.now() };
    return crypto.createHmac('sha256', this.signingCertPassword || 'fallback-secret')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private createManifest(files: Map<string, Buffer>): string {
    const manifest: Record<string, string> = {};
    
    for (const [filename, content] of Array.from(files.entries())) {
      if (filename !== 'manifest.json' && filename !== 'signature') {
        const hash = crypto.createHash('sha1').update(content).digest('hex');
        manifest[filename] = hash;
      }
    }
    
    return JSON.stringify(manifest);
  }

  private signManifest(manifestContent: string): Buffer {
    if (!this.signingCert || !this.wwdrCert) {
      // Return placeholder signature for development
      console.warn('Pass signing certificates not configured. Using development placeholder.');
      return Buffer.from('DEVELOPMENT_SIGNATURE_PLACEHOLDER');
    }

    try {
      // Decode P12 certificate
      const p12Der = Buffer.from(this.signingCert, 'base64');
      const p12Asn1 = forge.asn1.fromDer(p12Der.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.signingCertPassword);
      
      // Extract certificate and private key
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      
      if (!certBags || !keyBags) {
        throw new Error('Invalid P12 certificate format');
      }

      const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
      const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
      
      if (!cert || !key) {
        throw new Error('Could not extract certificate or key from P12');
      }

      // Create PKCS7 signature
      const p7 = forge.pkcs7.createSignedData();
      p7.content = forge.util.createBuffer(manifestContent, 'utf8');
      p7.addCertificate(cert);
      
      // Add WWDR certificate if provided
      if (this.wwdrCert) {
        const wwdrCertPem = Buffer.from(this.wwdrCert, 'base64').toString();
        const wwdrCertForge = forge.pki.certificateFromPem(wwdrCertPem);
        p7.addCertificate(wwdrCertForge);
      }

      p7.addSigner({
        key: key,
        certificate: cert,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentTypes,
            value: forge.pki.oids.data
          },
          {
            type: forge.pki.oids.messageDigest
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date()
          }
        ]
      });

      p7.sign({ detached: true });
      
      const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
      return Buffer.from(der, 'binary');
      
    } catch (error) {
      console.error('Pass signing failed:', error);
      // Return placeholder for development
      return Buffer.from('DEVELOPMENT_SIGNATURE_PLACEHOLDER');
    }
  }

  async generatePass(user: UserData): Promise<Buffer> {
    const passData = this.generatePassData(user);
    const zip = new JSZip();
    
    // Add pass.json
    const passJson = JSON.stringify(passData, null, 2);
    zip.file('pass.json', passJson);
    
    // Generate branded images (SVG-based for compatibility)
    const logoSvg = this.generateLogoSvg(160, 50);
    const logo2xSvg = this.generateLogoSvg(320, 100);
    const iconSvg = this.generateIconSvg(58);
    const icon2xSvg = this.generateIconSvg(116);
    const stripSvg = this.generateStripSvg();
    
    // Convert to PNG (placeholder implementation for development)
    const logo = this.svgToPng(logoSvg);
    const logo2x = this.svgToPng(logo2xSvg);
    const icon = this.svgToPng(iconSvg);
    const icon2x = this.svgToPng(icon2xSvg);
    const strip = this.svgToPng(stripSvg);
    
    // Add image files
    zip.file('logo.png', logo);
    zip.file('logo@2x.png', logo2x);
    zip.file('icon.png', icon);
    zip.file('icon@2x.png', icon2x);
    zip.file('strip.png', strip);
    
    // Create manifest
    const files = new Map<string, Buffer>();
    files.set('pass.json', Buffer.from(passJson));
    files.set('logo.png', logo);
    files.set('logo@2x.png', logo2x);
    files.set('icon.png', icon);
    files.set('icon@2x.png', icon2x);
    files.set('strip.png', strip);
    
    const manifestContent = this.createManifest(files);
    zip.file('manifest.json', manifestContent);
    
    // Sign manifest
    const signature = this.signManifest(manifestContent);
    zip.file('signature', signature);
    
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  private generateLogoSvg(width: number, height: number): string {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#logoGradient)" rx="8"/>
      <text x="${width/2}" y="${height/2 + 6}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${Math.floor(height * 0.35)}" font-weight="bold">
        Resicard
      </text>
    </svg>`;
  }

  private generateStripSvg(): string {
    const width = 375;
    const height = 144;
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stripGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#6366F1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
        </linearGradient>
        <pattern id="stripes" patternUnits="userSpaceOnUse" width="40" height="${height}">
          <rect width="20" height="${height}" fill="rgba(255,255,255,0.1)"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#stripGradient)" rx="12"/>
      <rect width="${width}" height="${height}" fill="url(#stripes)" rx="12"/>
      <text x="${width/2}" y="${height/2 - 8}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
        RESICARD
      </text>
      <text x="${width/2}" y="${height/2 + 18}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="16">
        St Andrews Community
      </text>
    </svg>`;
  }

  private generateIconSvg(size: number): string {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="iconGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#iconGradient)"/>
      <text x="${size/2}" y="${size/2 + size*0.15}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold">
        R
      </text>
    </svg>`;
  }

  private svgToPng(svgString: string): Buffer {
    // For development without Canvas library, return placeholder PNG headers
    // In production, this would convert SVG to PNG using a proper library
    const placeholder = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Compressed data
      0xE5, 0x27, 0xDE, 0xFC, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    // Store SVG data as comment in development
    console.log(`Generated SVG: ${svgString.substring(0, 100)}...`);
    return placeholder;
  }

  isConfigured(): boolean {
    return !!(this.passTypeIdentifier && this.teamIdentifier);
  }
}