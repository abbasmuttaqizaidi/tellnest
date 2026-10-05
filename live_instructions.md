Add the following components in the design-system. There are some with the intention/purose mentioned. For each of these components mention where they could be used under the Usage heading.
Components:
Conextual AI Bar
Feedback
Expandable Profile Card
Quick Option Picker
Quick Switcher
Tags
Task Widget Disclosure
Activities Card
Continuous Pagination
Create Community
Create new disclosure
Discrete Tabs
Dock Component
Edit Profile
Event Reminders - when we will implement the functionality that the writer can create an event about their article release. Dont implement the feature yet.
Extended Toolbar - can be used in the mobile view as navigation
Frequency Selector
Feature Tour - Suggest where can it be used
List Stack

Usage


---

## AI Agent Prompt: Custom Full-Page Loader for Google Login & Remove Clerk "Development Mode"

```markdown
### Task
Fix the Google OAuth login experience:
Currently, during/after Google login, the user sees Clerk's default loading spinner with the "Development mode" badge at the bottom (hosted on `clerk.accounts.dev` or Clerk's default callback). 

Replace this with our own branded full-page loading screen and completely eliminate the Clerk default loader and "Development mode" badge.

---

### Implementation Instructions

#### 1. Configure `<ClerkProvider>` to Disable Development Mode Warnings
In the root provider setup (e.g., `layout.tsx`, `root.tsx`, or `App.tsx`), update `<ClerkProvider>` to disable development mode banners:

```tsx
<ClerkProvider
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ...}
  appearance={{
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    elements: {
      footer: "hidden",
      footerAction: "hidden",
    },
  }}
>
  {children}
</ClerkProvider>
```

#### 2. Route Google OAuth to our own `/sso-callback`
Ensure the Google OAuth flow redirects directly back to our application's `/sso-callback` route rather than Clerk's hosted account portal:

If using a custom Google Sign-In button:
```tsx
import { useSignIn } from "@clerk/..."; // clerk-react, nextjs, or tanstack-react-start

const { signIn, isLoaded } = useSignIn();

const handleGoogleLogin = () => {
  if (!isLoaded) return;
  signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: "/sso-callback", // Redirect directly to our own app
    redirectUrlComplete: "/dashboard", // Target route after login
  });
};
```

If using Clerk's `<SignIn />` component:
Pass redirect URLs so that it redirects to our route:
```tsx
<SignIn
  forceRedirectUrl="/dashboard"
  fallbackRedirectUrl="/dashboard"
  signUpForceRedirectUrl="/dashboard"
  signUpFallbackRedirectUrl="/dashboard"
  appearance={{
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    elements: {
      footer: "hidden",
      footerAction: "hidden",
    },
  }}
/>
```

#### 3. Build the Branded Full-Page Loader on `/sso-callback`
Create or update the `/sso-callback` page to render a full-screen, branded loading screen while `<AuthenticateWithRedirectCallback />` finishes the session token exchange headlessly:

```tsx
import { AuthenticateWithRedirectCallback } from "@clerk/...";
import { Loader2 } from "lucide-react"; // or your project's spinner

export default function SSOCallbackPage() {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
      {/* ─── Our Custom Branded Loader ─── */}
      <div className="flex flex-col items-center space-y-5 text-center">
        {/* Brand Logo */}
        <div className="relative">
          <div className="absolute -inset-4 bg-slate-900/5 rounded-full blur-xl animate-pulse" />
          <img
            src="/logo.png"
            alt="Logo"
            className="relative h-12 w-auto object-contain"
          />
        </div>

        {/* Spinner & Message */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
            <span className="font-mono text-xs uppercase tracking-widest text-slate-800 font-semibold">
              Authenticating Session
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">
            Verifying credentials & establishing secure session...
          </span>
        </div>
      </div>

      {/* Headless Clerk Token Processing */}
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
```

#### 4. Add Global CSS Safeguards
In the main global CSS file (`globals.css` or `styles.css`), add rules to suppress any Clerk branding, footer, or dev badges:

```css
/* Hide Clerk development mode badge & footer branding */
.cl-footer,
.cl-footerAction,
.cl-internal-b3890c,
.cl-clerk-branding,
.cl-clerkBranding,
.cl-card__footer,
.cl-dev-mode-badge,
[data-localization-key*="developmentMode"],
[data-localization-key*="devMode"],
div[class*="cl-badge"],
div[class*="development-badge"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

#### 5. Verification Checklist
- Clicking Google login triggers the OAuth redirect.
- Returning from Google lands on `/sso-callback` which immediately displays our custom logo, spinner, and message.
- Zero Clerk default spinners or "Development mode" watermarks appear.
- Session is established and the user is redirected to the destination page.
```