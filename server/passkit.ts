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
}

interface UserData {
  id: number;
  username: string;
  email: string;
  loyaltyPoints?: number;
  loyaltyTier?: string;
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
    
    return {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeIdentifier,
      serialNumber,
      teamIdentifier: this.teamIdentifier,
      organizationName: "Resicard St Andrews",
      description: "Resicard St Andrews - Community Deals",
      logoText: "Resicard",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(12, 14, 26)",
      labelColor: "rgb(148, 163, 184)",
      generic: {
        primaryFields: [
          {
            key: "member",
            label: "Member",
            value: user.username || `User ${user.id}`
          }
        ],
        secondaryFields: [
          {
            key: "tier",
            label: "Tier",
            value: user.loyaltyTier || "Bronze"
          },
          {
            key: "points",
            label: "Points",
            value: (user.loyaltyPoints || 0).toString()
          }
        ],
        auxiliaryFields: [
          {
            key: "location",
            label: "Valid In",
            value: "St Andrews, Scotland"
          }
        ],
        backFields: [
          {
            key: "about",
            label: "About Resicard",
            value: "Exclusive deals and rewards for verified St Andrews residents and students."
          },
          {
            key: "contact",
            label: "Contact",
            value: "support@resicard.co.uk"
          },
          {
            key: "terms",
            label: "Terms & Conditions",
            value: "Visit our website for full terms and conditions."
          }
        ]
      },
      webServiceURL: process.env.REPLIT_DEV_DOMAIN ? 
        `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        "https://your-domain.replit.app",
      authenticationToken: this.generateAuthToken(user.id, serialNumber)
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
    
    // Add logo files (using SVG placeholders for now)
    const logoSvg = this.generateLogoSvg();
    zip.file('logo.png', Buffer.from('PLACEHOLDER_LOGO_PNG'));
    zip.file('logo@2x.png', Buffer.from('PLACEHOLDER_LOGO_PNG_2X'));
    zip.file('icon.png', Buffer.from('PLACEHOLDER_ICON_PNG'));
    zip.file('icon@2x.png', Buffer.from('PLACEHOLDER_ICON_PNG_2X'));
    
    // Create manifest
    const files = new Map<string, Buffer>();
    files.set('pass.json', Buffer.from(passJson));
    files.set('logo.png', Buffer.from('PLACEHOLDER_LOGO_PNG'));
    files.set('logo@2x.png', Buffer.from('PLACEHOLDER_LOGO_PNG_2X'));
    files.set('icon.png', Buffer.from('PLACEHOLDER_ICON_PNG'));
    files.set('icon@2x.png', Buffer.from('PLACEHOLDER_ICON_PNG_2X'));
    
    const manifestContent = this.createManifest(files);
    zip.file('manifest.json', manifestContent);
    
    // Sign manifest
    const signature = this.signManifest(manifestContent);
    zip.file('signature', signature);
    
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  private generateLogoSvg(): string {
    return `<svg width="160" height="50" viewBox="0 0 160 50" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="50" fill="#0C0E1A" rx="8"/>
      <text x="80" y="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
        Resicard
      </text>
    </svg>`;
  }

  isConfigured(): boolean {
    return !!(this.passTypeIdentifier && this.teamIdentifier);
  }
}