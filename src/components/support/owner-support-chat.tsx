'use client'

import { useOwnerSupport, useOwnerSupportRegister } from './owner-support-context'
import { SupportChat } from './support-chat'

// Owner Riley's chat panel. Riley's floating mascot button (in the
// root layout) opens this panel via OwnerSupportContext when the
// visitor is on /owner/*. The panel itself is mounted inside the
// owner (authed) layout so it inherits the dashboard's auth gates.
//
// hideDefaultTrigger means SupportChat doesn't render its own
// bottom-right floating button — Riley is the trigger now. The
// pathname is forwarded to /api/support-chat so the owner system
// prompt can tailor directions to the page the owner is on.

export function OwnerSupportChat() {
  useOwnerSupportRegister()
  const { open, setOpen } = useOwnerSupport()
  return (
    <SupportChat
      audience="owner"
      headerLabel="Chat with Riley 👋"
      triggerIcon="🛠️"
      triggerAriaLabel="Open chat with Riley"
      greeting="Hey — I'm Riley. What can I help you with on your dashboard? Setting up your profile, the QR code, marketing assets, posting an update — ask anything."
      reportButtonLabel="Report Bug to Mark"
      includePathname
      hideDefaultTrigger
      externalOpen={open}
      setExternalOpen={setOpen}
      theme={{
        buttonBg: '#1C3A2B',
        buttonShadow: '0 10px 28px rgba(28,58,43,0.45)',
        panelHeaderBg: 'rgba(28,58,43,0.55)',
        // Spec: amber report button for the owner variant.
        reportButtonBg: '#F5A623',
      }}
    />
  )
}
