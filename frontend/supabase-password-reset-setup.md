# Supabase Password Reset Configuration Guide

## 1. Configure Supabase URL Settings

Go to your Supabase Dashboard:
- Navigate to: Authentication → URL Configuration

### Site URL
Set the Site URL to your production domain:
```
https://medicare-nine-lilac.vercel.app
```

### Redirect URLs
Add these Redirect URLs to the allow list:

**Production:**
```
https://medicare-nine-lilac.vercel.app/auth/callback
https://medicare-nine-lilac.vercel.app/auth/confirm
https://medicare-nine-lilac.vercel.app/auth/update-password
https://medicare-nine-lilac.vercel.app/forgot-password
```

**Local Development (optional):**
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/auth/update-password
http://localhost:3000/forgot-password
```

## 2. Verify Email Authentication

Go to: Authentication → Providers → Email

Ensure:
- Email authentication is **enabled**
- Confirm email is **enabled** (recommended for security)
- Secure email change is **enabled** (recommended)

## 3. Check Email Template

Go to: Authentication → Email Templates → Reset Password

Verify the template contains:
```html
<a href="{{ .ConfirmationURL }}">
  Reset your password
</a>
```

**Important:**
- Do not replace the link with hardcoded URLs
- Do not remove the `{{ .ConfirmationURL }}` variable
- Keep the email subject clear: "Reset your Medicare password"

## 4. Configure SMTP (Recommended for Production)

Go to: Project Settings → Authentication → SMTP Settings

For reliable email delivery, configure custom SMTP using a provider like:

### Resend (Recommended)
- SMTP Host: smtp.resend.com
- SMTP Port: 587
- SMTP Username: resend
- SMTP Password: Your Resend API Key
- Sender Email: noreply@yourdomain.com
- Sender Name: Medicare

### Brevo (formerly Sendinblue)
- SMTP Host: smtp-relay.brevo.com
- SMTP Port: 587
- SMTP Username: Your Brevo username
- SMTP Password: Your Brevo SMTP key
- Sender Email: noreply@yourdomain.com
- Sender Name: Medicare

### SendGrid
- SMTP Host: smtp.sendgrid.net
- SMTP Port: 587
- SMTP Username: apikey
- SMTP Password: Your SendGrid API Key
- Sender Email: noreply@yourdomain.com
- Sender Name: Medicare

**Security Note:**
- Never commit SMTP credentials to Git
- Never use NEXT_PUBLIC_ variables for SMTP
- Store SMTP credentials in Supabase Dashboard only

## 5. Verify Environment Variables

Check your Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://medicare-nine-lilac.vercel.app
```

**Important:**
- Ensure NEXT_PUBLIC_SITE_URL matches your production domain
- Do not use localhost URLs in production
- Redeploy after changing environment variables

## 6. Test Email Delivery

After configuration:

1. Go to: Authentication → Users
2. Find a test user with email/password authentication
3. Use the Forgot Password form on your site
4. Check: Authentication → Logs → Auth Logs
5. Look for:
   - Email sent successfully
   - SMTP delivery status
   - Any error messages

## 7. Common Issues and Solutions

### Issue: "Email not sent"
**Check:**
- Email authentication is enabled
- Redirect URL is in allow list
- SMTP is configured (if using custom SMTP)
- Recipient email is allowed (check SMTP provider settings)

### Issue: "Link expired or invalid"
**Check:**
- The redirect URL in the template matches your configuration
- The token_hash is being passed correctly
- The auth/confirm route is handling the recovery type

### Issue: "Redirect loop"
**Check:**
- Middleware allows /forgot-password, /auth/update-password, /auth/confirm
- Auth callback doesn't redirect recovery users to dashboard
- Password update form signs out user after successful update

### Issue: "Rate limit exceeded"
**Solution:**
- Implement client-side cooldown (already in form)
- Check Supabase rate limits in dashboard
- Consider upgrading Supabase plan if needed

## 8. Verify User Account Type

Go to: Authentication → Users

Check the user you're testing:
- Ensure they have email/password authentication (not Google-only)
- Email must exactly match what you enter in the form
- Normalize email: `email.trim().toLowerCase()`

## 9. Test Complete Flow

1. **Forgot Password:**
   - Enter registered email
   - Submit form
   - Check for success message
   - Check email inbox (and spam folder)

2. **Reset Link:**
   - Click the reset link from email
   - Should redirect to /auth/update-password
   - Should show password form

3. **Update Password:**
   - Enter new password (8+ chars, uppercase, lowercase, number)
   - Confirm password
   - Submit
   - Should show success message
   - Should redirect to login

4. **Login:**
   - Try logging in with new password
   - Should work successfully
   - Old password should not work

## 10. Monitoring

After deployment, monitor:
- Supabase Auth Logs for email delivery errors
- Vercel logs for any redirect issues
- User reports of password reset problems

## 11. Security Checklist

- ✅ Passwords are never retrieved or displayed
- ✅ Reset links expire after 1 hour (Supabase default)
- ✅ Users are signed out after password update
- ✅ Recovery sessions are verified before password update
- ✅ Generic success message (no account enumeration)
- ✅ SMTP credentials are not exposed in frontend
- ✅ Redirect URLs are properly configured
- ✅ Rate limiting is implemented
