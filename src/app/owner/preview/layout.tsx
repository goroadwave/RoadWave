// Explicit pass-through layout. The root layout already imports
// globals.css and applies bg-night + text-cream to <body>, but having
// this file makes the layout chain unambiguous for the preview route
// and lets the page itself stay focused on guest-view content. We also
// pin the dark theme via inline style here so that even if some upstream
// CSS is fighting the page, this wrapper guarantees the right colors.
export default function OwnerPreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen bg-night text-cream font-sans"
      style={{ backgroundColor: '#0a0f1c', color: '#f5ecd9' }}
    >
      {children}
    </div>
  )
}
