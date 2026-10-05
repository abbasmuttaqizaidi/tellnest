import { createFileRoute } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import { TellnestLoader } from '../components/TellnestLoader'

export const Route = createFileRoute('/sso-callback')({
  component: SSOCallbackPage,
})

function SSOCallbackPage() {
  return (
    <div className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-[var(--bg-canvas)]">
      {/* ─── Our Custom Branded Full-Page Loader ─── */}
      <TellnestLoader
        variant="fullscreen"
        message="Authenticating literary folio..."
        submessage="Verifying credentials & establishing secure session..."
        className="!z-[2147483647] !bg-[var(--bg-canvas)]"
      />

      {/* Headless Clerk Token Processing */}
      <div className="sr-only opacity-0 pointer-events-none">
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/"
          signUpForceRedirectUrl="/"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        />
      </div>
    </div>
  )
}
