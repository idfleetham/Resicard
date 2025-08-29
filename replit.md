# Resicard St Andrews - Community Offers Platform

## Overview

Resicard St Andrews is a full-stack web application that connects verified local residents with exclusive deals from restaurants, bars, cafes, and businesses in the St Andrews community. The platform features role-based access control for residents, merchants, and administrators, with digital voucher generation, QR code scanning, and comprehensive deal management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

### Premium UI Redesign Implementation (August 29, 2025)
- Completed comprehensive premium UI redesign for resident dashboard with modern, lighter theme
- Implemented 16:9 aspect ratio deal cards with rounded corners, hover effects, and modern typography
- Added gradient accent system with indigo-to-violet color palette throughout interface
- Updated navigation with gradient underlines for active states and improved visual hierarchy
- Redesigned all tabs (Browse Deals, Wallet, Verification, Subscription) with consistent white card styling
- Applied modern shadow system and border styling across all components
- Enhanced button styling with gradient backgrounds and pill-shaped design
- Improved loading states with skeleton animations matching new design language

### Apple Wallet Pass Distribution System
- Implemented complete Apple Wallet pass distribution without requiring App Store app
- Created PassKit service with cryptographic signing and pass generation capabilities
- Built branded pass design with purple-to-blue gradient strips and dark theme (#111827)
- Comprehensive pass data including merchant info, offers, loyalty points, and QR codes
- Web interface at `/wallet/add` with official "Add to Apple Wallet" button and QR code scanning
- Full Apple Wallet update registration endpoints for push notifications
- SVG-based image generation system for cross-platform compatibility
- Automatic fallback behavior for logos and development mode support

### Customer Privacy Protection Implementation
- Added `generateCustomerAlias` utility function in shared schema for merchant views
- Updated merchant dashboard to show customer aliases (username or user_XXXXX format) instead of real names
- Modified staff earning tool to use customer aliases for privacy protection
- Applied aliasing to voucher redemption notifications and displays

### Reservation Provider Integration
- Added `reservation_provider` and `reservation_url` fields to merchants table
- Created reservation settings tab in merchant settings with dropdown for major providers
- Supported providers: OpenTable, Resy, Bookatable (Michelin), Tock, SevenRooms, Custom
- Implemented URL validation and test link functionality
- Added backend API endpoint `/api/merchant/reservation` for saving settings

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: Radix UI primitives for accessibility with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API server
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Authentication**: JWT-based authentication with role-based authorization (resident, merchant, admin)
- **File Handling**: Base64 encoding for profile photos and document uploads with image resizing
- **QR Code System**: Custom voucher generation with QR codes for deal redemption

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless connection
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **File Storage**: In-database Base64 encoding for images and documents (with provisions for Google Cloud Storage integration)

### Authentication and Authorization
- **JWT Tokens**: Stateless authentication with role-based access control
- **Password Security**: bcrypt hashing for secure password storage
- **Session Management**: Token-based sessions with automatic refresh capabilities
- **Document Verification**: Multi-step verification process for resident eligibility

### External Dependencies

#### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript, React Hook Form, React Query
- **Build Tools**: Vite for development and production builds, esbuild for server bundling
- **Database**: Drizzle ORM with Neon Database serverless PostgreSQL

#### UI and Styling
- **Component Library**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library

#### Business Logic Integrations
- **Payment Processing**: Stripe integration (configured for future payment handling)
- **QR Code Generation**: qrcode library for voucher QR codes
- **QR Code Scanning**: qr-scanner for merchant voucher verification
- **Apple Wallet Integration**: PassKit with JSZip, node-forge for pass generation and signing
- **File Upload**: Uppy with AWS S3 support (provisions for cloud storage)

#### Development and Deployment
- **Development**: Replit-specific plugins for development environment
- **Type Safety**: Zod for runtime type validation and schema definitions
- **Error Handling**: Comprehensive error boundaries and toast notifications

#### Planned Cloud Services
- **Google Cloud Storage**: For scalable file storage (integration ready)
- **Stripe Payments**: For subscription and payment processing (keys configurable)