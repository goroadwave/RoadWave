'use client'

import { SupportChat } from './support-chat'

// Owner-facing dashboard help widget. Mounted from the (authed) owner
// layout. Forwards the current pathname through to the API so the
// system prompt knows which page the owner is troubleshooting on.

export function OwnerSupportChat() {
  return (
    <SupportChat
      audience="owner"
      headerLabel="Dashboard Help"
      triggerIcon="🛠️"
      triggerAriaLabel="Open dashboard help"
      greeting="Hi — what can I help you with on the dashboard? Describe the issue and I'll walk you through it."
      reportButtonLabel="Report Bug to Mark"
      includePathname
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
