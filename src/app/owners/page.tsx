import { redirect } from 'next/navigation'

// Plural "/owners" is a common typo for "/owner" or a guess at a marketing
// landing page. Send those visitors to the actual campground-owner page,
// which is the closest match — it's the public sales page that explains
// what RoadWave does for campground owners.
export default function OwnersRedirect() {
  redirect('/campgrounds')
}
