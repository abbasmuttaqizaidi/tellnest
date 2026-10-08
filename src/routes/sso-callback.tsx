import { createFileRoute } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import { Loader2 } from 'lucide-react'
import { HatchpenLogo } from '../components/HatchpenLogo'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/sso-callback')({
  head: () =>
    generateMeta({
      title: 'Authenticating Session',
      noindex: true,
    }),
  component: SSOCallbackPage,
})

export default function SSOCallbackPage() {
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#111722] flex flex-col items-center justify-center px-6">
      {/* ─── Our Custom Branded Loader ─── */}
      <div className="flex flex-col items-center space-y-5 text-center">
        {/* Brand Logo */}
        <div className="relative">
          <HatchpenLogo size="lg" variant="full" />
        </div>

        {/* Spinner & Message */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-slate-900 dark:text-slate-100" />
            <span className="font-mono text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 font-semibold">
              Authenticating Session
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
            Verifying credentials & establishing secure session...
          </span>
        </div>
      </div>

      {/* Headless Clerk Token Processing */}
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
    </div>
  )
}
