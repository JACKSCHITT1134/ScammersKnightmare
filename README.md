# Scammer's Knightmare - Threat Detection Platform

A comprehensive threat detection and analysis platform powered by IPQS API, designed to protect users from scammers, phishing attacks, and online predators.

## Features

### 🛡️ Multi-Input Scanning
- **Phone Number Analysis**: Detect suspicious phone numbers, VoIP lines, and carrier information
- **Email Validation**: Identify disposable emails, spam traps, and compromised addresses
- **URL Analysis**: Deep link scanning with redirect chain analysis and phishing detection
- **Username/Social Profile**: Check for predator patterns and suspicious account behavior

### 📊 Advanced Threat Detection
- Real-time threat scoring (0-100)
- Multi-level threat classification (Safe, Low, Medium, High, Critical)
- Predator pattern detection with ML-powered analysis
- Link sandbox analysis for suspicious URLs

### 💰 Flexible Pricing
- **Free Tier**: 1 comprehensive scan to try the platform
- **Premium ($19.99/mo or $199.99/yr)**: Unlimited scans, history, auto-monitoring, alerts
- **Family ($39.99/mo or $399.99/yr)**: All Premium features + 5 family members + parental controls

### 🔐 Admin System
Two admin accounts with full system control:
- **Primary Admin**: JACKSCHITT1134 / Dilligaf1134#
- **Backup Admin**: KRACKERJACK1134 / Dilligaf1134#

Admin capabilities:
- User management (view, edit, delete)
- Manual subscription activation for CashApp payments
- API quota monitoring and analytics
- Scan history analysis with recharts visualizations
- Email notification queue management
- Auto-monitoring configuration

## Tech Stack

- **Frontend**: React 18.3 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: OnSpace Cloud (Supabase-compatible)
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with email/password
- **Edge Functions**: Deno runtime for IPQS API integration
- **Charts**: Recharts for analytics visualization

## Database Schema

### Tables
- `user_profiles` - User accounts with tier and admin flags
- `scan_history` - Complete scan records with threat analysis
- `scan_cache` - 24-hour cache to reduce API costs
- `api_quota` - Daily API usage tracking by scan type
- `pricing_config` - Dynamic pricing configuration
- `admin_activity_log` - Audit log for admin actions
- `auto_monitor_config` - Automated monitoring schedules
- `email_queue` - Email notification queue

## Payment Integration

### CashApp Direct Payment
- Cash Tag: **$JACKSCHITT1134**
- Shareable payment links for each plan tier
- Manual activation workflow for admin
- Payment verification via email screenshot

## Setup Instructions

### Prerequisites
1. OnSpace Cloud account with backend enabled
2. IPQS API key (stored in backend secrets)

### Environment Variables
```env
VITE_SUPABASE_URL=<your-onspace-cloud-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Admin Access
1. Navigate to `/admin/login`
2. Enter admin credentials:
   - Username: `JACKSCHITT1134` or `KRACKERJACK1134`
   - Password: `Dilligaf1134#`
3. Access admin dashboard at `/admin`

### First-Time Admin Setup
The admin accounts are auto-created on first login and automatically granted admin privileges via database triggers.

## Deployment

### Via OnSpace Platform
1. Click "Publish" in the top-right toolbar
2. Choose deployment option:
   - **Publish**: Deploy to `*.onspace.app` subdomain (free)
   - **Custom Domain**: Add your own domain/subdomain

### Manual Deployment
```bash
npm install
npm run build
# Deploy dist/ folder to your hosting provider
```

## API Integration

### IPQS Configuration
The platform uses IPQS (IP Quality Score) API for threat detection:
- IP fraud scoring
- Email validation
- URL malware/phishing detection
- Phone number analysis

API key is stored securely in OnSpace Cloud backend secrets and accessed via Edge Functions.

## Security Features

- Row Level Security (RLS) on all database tables
- Admin-only routes with authentication checks
- Scan result caching to prevent API abuse
- Password hashing via Supabase Auth
- CORS protection on Edge Functions
- Admin activity logging

## Usage Analytics

The admin dashboard provides:
- Total users and premium conversions
- Scan volume by type (bar charts)
- Threat level distribution (pie charts)
- Daily API quota tracking
- User activity timelines

## Support

For manual subscription activation after CashApp payment:
- Email: jackschitt1134@gmail.com
- Include: Payment screenshot + registered email address
- Activation: Within 24 hours (same-day for expedited requests)

## License

Proprietary - All rights reserved

---

**Built with OnSpace AI-Powered Development Platform**
