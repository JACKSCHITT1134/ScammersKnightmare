# 🚀 Scammer's Knightmare - Deployment & Testing Guide

## 📋 Pre-Deployment Checklist

### ✅ Backend Configuration (OnSpace Cloud)
- [x] OnSpace Cloud enabled and ready
- [x] Database tables created and configured
- [x] RLS policies active on all tables
- [x] API keys configured:
  - [x] OPERIT_API_KEY (sk-77c6ed7da42245ff9fe810a0383dc818)
  - [x] ONLYFANS_API_KEY (ofapi_J3b0VFTxKofCQdftxyunJWHZ9nvQZDq8Gk6sLyLXafc409f0)
  - [x] IPQS_API_KEY (needs to be configured)
- [x] Edge Functions deployed:
  - [x] operit-ai
  - [x] scan-threat

### ⚠️ MISSING: IPQS API Key Configuration

**CRITICAL:** You need to add your IPQS API key for threat scanning to work.

Based on your earlier messages, your IPQS key is: `z0cgWGAvDlAuVBtUhODmTcOFNLE6P7Te`

**To configure:**
1. Go to Cloud Dashboard (right panel → Cloud button)
2. Navigate to "Secrets" tab
3. Add new secret: `IPQS_API_KEY` = `z0cgWGAvDlAuVBtUhODmTcOFNLE6P7Te`
4. Save and wait for edge functions to reload (~30 seconds)

---

## 🧪 Testing Procedures

### 1. Admin Login Testing

**Access:** `/admin/login`

**Test Accounts:**
- **Primary Admin:**
  - Username: `JACKSCHITT1134`
  - Password: `Dilligaf1134#` (or set your own on first login)
  
- **Backup Admin:**
  - Username: `KRACKERJACK1134`
  - Password: `Dilligaf1134#` (or set your own on first login)

**Expected Flow:**
1. Enter username (automatically converts to uppercase)
2. If first time: Redirects to admin dashboard immediately
3. If password set: Prompts for password
4. After login: Full access to admin dashboard

**What to Test:**
- [ ] Login with JACKSCHITT1134
- [ ] Set password on first login
- [ ] Logout and login again with password
- [ ] Test backup account KRACKERJACK1134
- [ ] Verify localStorage persistence (refresh page, should stay logged in)

---

### 2. Admin Dashboard Testing

**Features to Test:**

#### User Management
- [ ] View all users in the system
- [ ] Click "Edit" button on a non-admin user
- [ ] Change user tier (free → premium → family)
- [ ] Set scan limits (or leave blank for unlimited)
- [ ] Save changes and verify update
- [ ] Delete a test user account

#### AI Features Management
- [ ] Enable AI features for a user (toggle button)
- [ ] Check "AI Chat" checkbox
- [ ] Check "AI Analysis" checkbox
- [ ] Set monthly quota (try: 100 queries)
- [ ] Verify quota displays correctly

#### CashApp Payment Activation
- [ ] Copy CashApp tag `$JACKSCHITT1134`
- [ ] Copy Premium monthly link ($19.99)
- [ ] Copy Premium yearly link ($199.99)
- [ ] Copy Family monthly link ($39.99)
- [ ] Copy Family yearly link ($399.99)
- [ ] Test manual activation:
  - Enter test user email
  - Select tier (Premium or Family)
  - Select period (Monthly or Yearly)
  - Click "Activate Subscription"
  - Verify user upgraded

#### Analytics & Charts
- [ ] Verify "Total Users" stat displays
- [ ] Check "Total Scans" count
- [ ] View "Today's API Calls" counter
- [ ] Inspect "Scans by Type" bar chart
- [ ] Review "Threat Level Distribution" pie chart
- [ ] Check AI usage stats (30-day totals)

---

### 3. Threat Scanning Testing

**Access:** `/scan`

**Test Cases:**

#### Email Scanning
Test these emails:
- [ ] **Valid:** `test@gmail.com` (should be safe/low)
- [ ] **Disposable:** `test@tempmail.com` (should flag as critical)
- [ ] **Invalid:** `not-an-email` (should show invalid)

#### URL Scanning
Test these URLs:
- [ ] **Safe:** `https://google.com` (should be safe)
- [ ] **Suspicious:** `http://bit.ly/xxxxx` (may show medium/high)
- [ ] **Test malicious:** Use IPQS test URLs from their docs

#### Phone Scanning
Test these numbers:
- [ ] **Valid US:** `+1-555-0100` (should validate)
- [ ] **VOIP:** Test with known VOIP number
- [ ] **Invalid:** `123` (should show invalid)

**Expected Results:**
- Threat level badge (Safe, Low, Medium, High, Critical)
- Threat score (0-100)
- Detailed indicators table
- AI enhancement button (if user has AI enabled)

---

### 4. AI Chat Testing

**Access:** `/ai-chat`

**Prerequisites:**
1. Create a test user account (sign up at `/signin`)
2. As admin, enable AI features for that user:
   - Go to Admin Dashboard → Operit AI Features Management
   - Find the user → Click "Disabled" → Check "AI Chat" → Save

**Test Conversation:**
1. Login as test user
2. Navigate to `/ai-chat`
3. Start new chat
4. Send test messages:
   - "Hello, who are you?"
   - "Analyze this email for threats: earn-money-now@gmail.com"
   - "What are common signs of a phishing scam?"
5. Verify:
   - [ ] Messages appear correctly
   - [ ] AI responds with Grok-powered answers
   - [ ] Conversation saves (check sidebar)
   - [ ] Quota counter updates (if set)
   - [ ] Can load previous conversations
   - [ ] Can delete conversations

---

### 5. AI-Enhanced Scanning

**Test Flow:**
1. Login as user with AI analysis enabled
2. Perform a scan (email/URL/phone)
3. Wait for results
4. Look for "AI-Enhanced Analysis" card
5. Click "Get AI Insights" button
6. Verify:
   - [ ] AI enhancement loads
   - [ ] Provides additional context
   - [ ] Offers recommendations
   - [ ] Analyzes threat patterns

---

### 6. User Registration & Tier System

#### Free Tier Testing
1. Sign up new account at `/signin`
2. Verify initial state:
   - [ ] Tier = "free"
   - [ ] Scans remaining = 1 (or configured amount)
   - [ ] No AI access
3. Perform a scan
4. Check scans remaining decrements
5. Try scanning with 0 scans left (should block)

#### Premium/Family Tier Testing
1. As admin, manually activate a user:
   - Go to Admin Dashboard
   - Use CashApp activation form
   - Enter user email
   - Select Premium/Monthly
   - Activate
2. Login as that user
3. Verify:
   - [ ] Tier shows "premium" or "family"
   - [ ] Unlimited scans (counter shows ∞)
   - [ ] Access to all features

---

### 7. Database & Caching

#### Scan History
1. Perform multiple scans as authenticated user
2. Go to `/history`
3. Verify:
   - [ ] All scans listed
   - [ ] Correct timestamps
   - [ ] Threat levels displayed
   - [ ] Can view details

#### Cache Testing
1. Scan the same input twice quickly
2. Check browser network tab
3. Verify second scan returns faster (cached)
4. Cache expires after 24 hours

#### API Quota Tracking
1. As admin, check "Today's API Calls"
2. Perform various scans
3. Refresh admin dashboard
4. Verify counters increment

---

## 🔧 Troubleshooting

### Admin Login Issues
**Problem:** "Login failed" after entering username
**Solution:**
1. Open browser console (F12)
2. Check for localStorage errors
3. Clear localStorage: `localStorage.clear()`
4. Try again

**Problem:** Admin panel shows blank/redirects
**Solution:**
1. Verify localStorage has `admin_session` key
2. Check console for `checkAdminAccess` logs
3. Ensure edge functions are deployed

### Scan Errors
**Problem:** "IPQS API key not configured"
**Solution:** Add `IPQS_API_KEY` to Cloud → Secrets (see top of document)

**Problem:** "No scans remaining"
**Solution:**
1. Login as admin
2. Edit user → Set tier to Premium or increase scan count

### AI Features Not Working
**Problem:** "AI features not enabled"
**Solution:**
1. Admin dashboard → Operit AI section
2. Find user → Toggle "Enabled"
3. Check AI Chat and/or AI Analysis boxes
4. Save

**Problem:** AI chat shows "quota exceeded"
**Solution:**
1. Admin can increase `ai_monthly_quota` for user
2. Or set to blank/null for unlimited

---

## 📊 Production Monitoring

### Key Metrics to Watch
1. **API Quota Usage** (Admin Dashboard)
   - IPQS has free tier limits
   - Monitor daily calls
   - Set up alerts before hitting limits

2. **AI Usage** (Admin Dashboard → AI Stats)
   - Total requests
   - Token consumption
   - Per-user usage

3. **User Growth**
   - Total users
   - Premium conversions
   - Active scanners

### Database Maintenance
- Scan cache auto-expires after 24 hours
- Consider periodic cleanup of old scan history (6+ months)
- Monitor `ai_usage_log` table size

---

## 🚀 Ready for Deployment

Once all tests pass:

1. **Publish to OnSpace:**
   - Click "Publish" button (top-right toolbar)
   - Choose "Publish" for default .onspace.app URL
   - Or "Add Existing Domain" for custom domain

2. **Share Access:**
   - Admin login: `https://your-domain.com/admin/login`
   - Public scan: `https://your-domain.com/scan`
   - User registration: `https://your-domain.com/signin`

3. **Payment Links:**
   - Share CashApp links from admin dashboard
   - Or integrate Stripe (future enhancement)

---

## 💰 Payment Processing

### CashApp Payment Flow
1. User contacts admin for upgrade
2. Admin sends appropriate payment link:
   - Premium Monthly: `https://cash.app/$JACKSCHITT1134/19.99`
   - Premium Yearly: `https://cash.app/$JACKSCHITT1134/199.99`
   - Family Monthly: `https://cash.app/$JACKSCHITT1134/39.99`
   - Family Yearly: `https://cash.app/$JACKSCHITT1134/399.99`
3. User pays via CashApp
4. Admin verifies payment in CashApp
5. Admin manually activates in dashboard:
   - Enter user email
   - Select tier + period
   - Click "Activate Subscription"
6. User immediately gets access

### Payment Verification
- Check CashApp notifications for incoming payments
- Note the payer's CashApp username
- Match to user email in system
- Activate subscription

---

## 🎯 Next Steps & Enhancements

See the suggestion buttons below for recommended features to add next!

---

**Built with OnSpace Cloud + Operit AI + IPQS**
**Admin Contact:** jackschitt1134@gmail.com | $JACKSCHITT1134
