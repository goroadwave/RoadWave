// Pages Router entrypoint. Loads the same globals.css that the App Router uses
// so Tailwind utilities and the custom theme tokens (--color-night, --color-flame,
// font variables, .wave-emoji keyframes) work for any page under `pages/`.
import '../app/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
