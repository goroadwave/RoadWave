// Re-export the opengraph-image so Twitter/X uses the same branded preview.
// Next.js's twitter-image file convention emits <meta name="twitter:image">
// (plus type/width/height/alt) — keeping the artwork DRY with the OG one.
export { default, alt, size, contentType } from './opengraph-image'
