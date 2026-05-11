// Shared RoadWave brand helpers for every PDF/PNG QR card the
// owner-side dashboard generates (Counter Card, Site Card, Welcome
// Sign, Front Desk Card, Picnic Table Flyer, Letter QR, 5×7 QR).
//
// One canonical wordmark treatment everywhere:
//   "Road"  (cream  #f5ecd9)
//   "Wave"  (flame  #f59e0b)
//   👋      (rasterised PNG, sits flush against the right of "Wave")
//
// jsPDF's built-in WinAnsi fonts can't render the emoji codepoint
// directly, so we rasterise 👋 to a transparent PNG via the browser
// canvas + the OS's color-emoji font, then doc.addImage() it as part
// of the wordmark line. Without this rasterisation the wave glyph
// either falls back to ".notdef" boxes or silently disappears on
// printed output.

// Canonical brand palette — matches the site's --color-* tokens in
// globals.css so the PDFs read the same as anything else on the site.
export const BRAND_RGB = {
  /** #f5ecd9 — "Road" letters + general light text on the navy bg */
  cream: [245, 236, 217] as const,
  /** #f59e0b — "Wave" letters + amber accents */
  flame: [245, 158, 11] as const,
  /** #0a0f1c — page background */
  night: [10, 15, 28] as const,
  /** #94a3b8 — secondary body text */
  mist: [148, 163, 184] as const,
  /** #111a2e — slightly raised card surface */
  card: [17, 26, 46] as const,
  /** #22c55e — checkmark green */
  leaf: [34, 197, 94] as const,
}

export type Rgb = readonly [number, number, number]

// Rasterise an emoji glyph to a transparent PNG data URL using the
// browser canvas + OS color-emoji font stack. Falls back to '' on
// servers (no document) — callers should treat that as "no wave"
// and render the wordmark without the image, but in practice every
// component that calls this is 'use client'.
export function renderEmojiToPng(emoji: string, sizePx: number): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = sizePx
  canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  // Slightly under-fill so the glyph isn't clipped at the edges by
  // browsers that render emoji larger than the nominal font size.
  const fontPx = Math.round(sizePx * 0.82)
  ctx.font =
    `${fontPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", ` +
    `"Twemoji Mozilla", "EmojiOne Color", "Android Emoji", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, sizePx / 2, sizePx / 2 + sizePx * 0.04)
  return canvas.toDataURL('image/png')
}

type DrawWordmarkArgs = {
  /** jsPDF document instance. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsPDF types live behind the dynamic import callers use
  doc: any
  /** Font size in points. Wave PNG is sized to match. */
  fontSize: number
  /** Pre-rendered 👋 PNG data URL. Pass null to skip the emoji. */
  waveDataUrl: string | null
  /** Y baseline for the text (jsPDF's text Y is the bottom of the glyph). */
  y: number
  /**
   * Horizontal placement:
   *   { align: 'left',   x }   — Road's left edge starts at x
   *   { align: 'center', x }   — wordmark + wave is centered around x
   *   { align: 'right',  x }   — the right edge of the wave (or "Wave"
   *                              when waveDataUrl is null) ends at x
   */
  align: 'left' | 'center' | 'right'
  x: number
}

/**
 * Draw the canonical RoadWave wordmark on a jsPDF doc. Sets the font
 * to helvetica-bold + the given size, draws "Road" in cream, "Wave"
 * in flame, then drops the 👋 PNG flush against the right side of
 * "Wave". Restores prior font weight/size are NOT restored — the
 * caller should setFont/setFontSize again after this call if they
 * need different text afterwards (every existing caller does so).
 *
 * Returns the total drawn width so callers can position what comes
 * next (e.g. a tagline next to the wordmark).
 */
export function drawBrandWordmark(args: DrawWordmarkArgs): number {
  const { doc, fontSize, waveDataUrl, y } = args
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(fontSize)
  const roadW = doc.getTextWidth('Road')
  const waveW = doc.getTextWidth('Wave')
  // Tight gap between "Wave" and the 👋 image — matches the site logo's
  // visual rhythm. Image width is the same as the font size so the
  // wave looks proportional to the letters.
  const waveImgGap = waveDataUrl ? fontSize * 0.18 : 0
  const waveImgSize = waveDataUrl ? fontSize : 0
  const totalW = roadW + waveW + waveImgGap + waveImgSize

  let startX: number
  if (args.align === 'left') startX = args.x
  else if (args.align === 'center') startX = args.x - totalW / 2
  else startX = args.x - totalW

  doc.setTextColor(BRAND_RGB.cream[0], BRAND_RGB.cream[1], BRAND_RGB.cream[2])
  doc.text('Road', startX, y)
  doc.setTextColor(BRAND_RGB.flame[0], BRAND_RGB.flame[1], BRAND_RGB.flame[2])
  doc.text('Wave', startX + roadW, y)

  if (waveDataUrl) {
    // jsPDF text Y is the bottom of the glyph; place the image so its
    // visual center matches the cap-height of the letters.
    const imgX = startX + roadW + waveW + waveImgGap
    const imgY = y - waveImgSize + waveImgSize * 0.15
    doc.addImage(waveDataUrl, 'PNG', imgX, imgY, waveImgSize, waveImgSize)
  }

  return totalW
}
