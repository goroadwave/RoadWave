import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-bricolage: 'Bricolage Grotesque', sans-serif;
            --font-dm-sans: 'DM Sans', sans-serif;
            --font-instrument: 'Instrument Serif', serif;
          }
        `}</style>
      </Head>
      <body className="bg-night text-cream">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
