# Custom Domain Setup Instructions

This document provides step-by-step DNS configuration instructions for setting up custom domains on various platforms, including OnSpace, Vercel, and others.

## OnSpace
1. Log in to your OnSpace account.
2. Navigate to the **Domains** section under **Settings**.
3. Click on **Add Domain**.
4. Enter your custom domain name (e.g., `example.com`).
5. Follow the on-screen instructions to update your DNS records:
   - Add an **A record** pointing to OnSpace's IP address.
   - Add a **CNAME record** for www subdomains if required.
6. Verify the domain by clicking the **Verify Domain** button.
7. Wait for DNS changes to propagate (may take up to 48 hours).

## Vercel
1. Log in to your Vercel dashboard.
2. Select your project and go to the **Settings** tab.
3. Scroll down to the **Domains** section.
4. Click on **Add a Domain**.
5. Enter your custom domain name (e.g., `example.com`).
6. Follow the instructions provided:
   - Add a **CNAME record** for the root domain pointing to Vercel.
   - For www subdomains, set up a CNAME record appropriately.
7. Click **Continue** and verify your domain status.
8. Wait for DNS propagation to complete.

## Other Platforms (General Instructions)
1. Access your DNS provider’s dashboard (e.g., GoDaddy, Namecheap).
2. Navigate to the DNS management section.
3. Add the necessary DNS records as indicated by your hosting provider.
4. Verify the domain as required by the hosting platform.
5. Monitor for DNS propagation. Check if your domain is pointing correctly after 48 hours.

## Notes
- Ensure all DNS records are correctly set up to avoid downtime.
- Use tools like `dig` or online DNS checkers to verify DNS configurations.

For additional assistance, consult the support documentation of your domain registrar or hosting provider.
