import { redirect } from 'next/navigation'

// /demo is the public "Try the Demo" landing surface — homepage hero,
// owners page, footer, Riley tour, and the legacy Pages-Router tour
// all point here. The interactive demo itself lives at /demo/[campground]
// and renders any slug (saved demos from the /campgrounds wizard, or
// the format-slug-as-name fallback for unknown slugs).
//
// Without this page, /demo 404s because the dynamic segment is
// required. Redirect to a stable, readable default slug so every
// "Try the Demo" CTA in the app lands on a working preview.

export const dynamic = 'force-dynamic'

export default function DemoIndexPage(): never {
  redirect('/demo/sample-rv-park')
}
