import { redirect } from 'next/navigation'

// The single-tool pivot retired the multi-trend "studio" picker. Anyone landing
// here — old links, post-login `next`, in-app nav — is sent to their creations.
export default function StudioPage() {
  redirect('/me/creations')
}
