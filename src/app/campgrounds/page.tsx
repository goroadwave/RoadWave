import { permanentRedirect } from 'next/navigation'

// /campgrounds is the legacy URL for the owner-facing marketing page.
// Per the routing spec, it now permanently redirects to /owners (the
// canonical location) so old links + ad campaigns + email signatures
// keep working without serving duplicate content.
export default function CampgroundsRedirect() {
  permanentRedirect('/owners')
}
