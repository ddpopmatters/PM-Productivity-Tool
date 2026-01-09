# Supabase Email Templates

Copy these templates into your Supabase Dashboard under **Authentication > Email Templates**.

These templates match the PM Productivity Tool's visual style with the ocean blue color scheme.

---

## 1. Confirm Signup

**Subject:** `Confirm your email for PM Productivity Tool`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #cfebf8;">
  <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em;">PM Productivity Tool</h1>
  </div>

  <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #11607d; margin: 0 0 16px 0; font-size: 20px;">Welcome! Confirm your email</h2>

    <p style="color: #4f4f4f; margin: 0 0 24px 0;">
      Thanks for signing up for PM Productivity Tool. Please confirm your email address by clicking the button below.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 119, 182, 0.4);">
        Confirm Email Address
      </a>
    </div>

    <p style="color: #6d6d6d; font-size: 14px; margin: 24px 0 0 0;">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #8f8f8f; margin: 0;">
      This link will expire in 24 hours. If the button doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="font-size: 12px; color: #0077b6; word-break: break-all; margin: 8px 0 0 0;">
      {{ .ConfirmationURL }}
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="font-size: 12px; color: #6d6d6d; margin: 0;">
      Population Matters - PM Productivity Tool
    </p>
  </div>
</body>
</html>
```

---

## 2. Reset Password

**Subject:** `Reset your password for PM Productivity Tool`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #cfebf8;">
  <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em;">PM Productivity Tool</h1>
  </div>

  <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #11607d; margin: 0 0 16px 0; font-size: 20px;">Reset your password</h2>

    <p style="color: #4f4f4f; margin: 0 0 24px 0;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 119, 182, 0.4);">
        Reset Password
      </a>
    </div>

    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
      <p style="color: #c2410c; font-size: 14px; margin: 0;">
        <strong>Security notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #8f8f8f; margin: 0;">
      This link will expire in 1 hour. If the button doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="font-size: 12px; color: #0077b6; word-break: break-all; margin: 8px 0 0 0;">
      {{ .ConfirmationURL }}
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="font-size: 12px; color: #6d6d6d; margin: 0;">
      Population Matters - PM Productivity Tool
    </p>
  </div>
</body>
</html>
```

---

## 3. Magic Link (if enabled)

**Subject:** `Your sign-in link for PM Productivity Tool`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #cfebf8;">
  <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em;">PM Productivity Tool</h1>
  </div>

  <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #11607d; margin: 0 0 16px 0; font-size: 20px;">Sign in to your account</h2>

    <p style="color: #4f4f4f; margin: 0 0 24px 0;">
      Click the button below to securely sign in to PM Productivity Tool. No password needed!
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 119, 182, 0.4);">
        Sign In Now
      </a>
    </div>

    <p style="color: #6d6d6d; font-size: 14px; margin: 24px 0 0 0;">
      If you didn't request this link, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #8f8f8f; margin: 0;">
      This link will expire in 1 hour and can only be used once. If the button doesn't work, copy and paste this URL:
    </p>
    <p style="font-size: 12px; color: #0077b6; word-break: break-all; margin: 8px 0 0 0;">
      {{ .ConfirmationURL }}
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="font-size: 12px; color: #6d6d6d; margin: 0;">
      Population Matters - PM Productivity Tool
    </p>
  </div>
</body>
</html>
```

---

## 4. Invite User

**Subject:** `You've been invited to PM Productivity Tool`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #cfebf8;">
  <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em;">PM Productivity Tool</h1>
  </div>

  <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #11607d; margin: 0 0 16px 0; font-size: 20px;">You're invited!</h2>

    <p style="color: #4f4f4f; margin: 0 0 24px 0;">
      You've been invited to join <strong>PM Productivity Tool</strong>, the project management platform for Population Matters.
    </p>

    <div style="background: #e6f7fb; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="color: #11607d; margin: 0; font-size: 14px;">
        <strong>What you can do:</strong>
      </p>
      <ul style="color: #4f4f4f; margin: 12px 0 0 0; padding-left: 20px;">
        <li>Track projects and tasks across teams</li>
        <li>Collaborate with colleagues in real-time</li>
        <li>View team workloads and deadlines</li>
        <li>Generate status reports</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 119, 182, 0.4);">
        Accept Invitation
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #8f8f8f; margin: 0;">
      This invitation will expire in 7 days. If the button doesn't work, copy and paste this URL:
    </p>
    <p style="font-size: 12px; color: #0077b6; word-break: break-all; margin: 8px 0 0 0;">
      {{ .ConfirmationURL }}
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="font-size: 12px; color: #6d6d6d; margin: 0;">
      Population Matters - PM Productivity Tool
    </p>
  </div>
</body>
</html>
```

---

## 5. Change Email Address

**Subject:** `Confirm your new email for PM Productivity Tool`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #cfebf8;">
  <div style="background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em;">PM Productivity Tool</h1>
  </div>

  <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #11607d; margin: 0 0 16px 0; font-size: 20px;">Confirm your new email</h2>

    <p style="color: #4f4f4f; margin: 0 0 24px 0;">
      You requested to change your email address. Please confirm your new email by clicking the button below.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0077b6 0%, #00b4d8 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 119, 182, 0.4);">
        Confirm New Email
      </a>
    </div>

    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin: 24px 0;">
      <p style="color: #c2410c; font-size: 14px; margin: 0;">
        <strong>Didn't request this?</strong> If you didn't request an email change, please contact your administrator immediately.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #8f8f8f; margin: 0;">
      This link will expire in 24 hours. If the button doesn't work, copy and paste this URL:
    </p>
    <p style="font-size: 12px; color: #0077b6; word-break: break-all; margin: 8px 0 0 0;">
      {{ .ConfirmationURL }}
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="font-size: 12px; color: #6d6d6d; margin: 0;">
      Population Matters - PM Productivity Tool
    </p>
  </div>
</body>
</html>
```

---

## How to Apply These Templates

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** > **Email Templates**
3. For each template type (Confirm signup, Reset password, etc.):
   - Click on the template
   - Replace the **Subject** with the one provided above
   - Replace the **Body** HTML with the HTML provided above
   - Click **Save**

The templates use Supabase's template variables:
- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .Email }}` - The user's email address
- `{{ .Token }}` - The confirmation token (if needed)
