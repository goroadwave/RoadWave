import { redirect } from 'next/navigation'

// Friendly alias for the Past Waves surface. The UI is already labelled
// "Past Waves" everywhere; the implementation still lives at
// /crossed-paths (with its /crossed-paths/<id> conversation threads and
// server actions), so this is a thin alias rather than a route move.
// Anonymous visitors get bounced to /login by the (app) layout once the
// redirect lands on /crossed-paths.
export default function PastWavesAlias(): never {
  redirect('/crossed-paths')
}
