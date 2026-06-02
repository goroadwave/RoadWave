// Shared Schema.org JSON-LD builders used by the public SEO pages.
//
// Why a helper module rather than per-page inline objects? The site is
// growing a cluster of comparison + cornerstone pages (Phase 2 + Phase 4)
// and we want every page's structured data to use the exact same shape
// for FAQ, BreadcrumbList, and Article so Google's rich-result parser
// sees a consistent surface across the cluster.
//
// Builders return plain objects — pages stringify them inside a
// <script type="application/ld+json"> tag via dangerouslySetInnerHTML.
//
// Conventions baked in:
//   - @context is always 'https://schema.org' (not 'http://')
//   - All URL fields use the canonical https://www.getroadwave.com host
//   - Builders intentionally have no aggregateRating/review fields —
//     adding fake reviews is forbidden per RoadWave's editorial rules
//
// Pair this with the Organization + WebSite + SoftwareApplication blocks
// emitted by the root layout for full site coverage.

export const SITE = 'https://www.getroadwave.com'

// --- FAQPage ---------------------------------------------------------------

export type FAQEntry = { q: string; a: string }

export function buildFAQPage(faqs: ReadonlyArray<FAQEntry>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } as const
}

// --- BreadcrumbList --------------------------------------------------------
//
// Pass an array of { name, path } pairs starting from Home. Paths are
// relative; the builder joins them onto the canonical site host so the
// emitted URLs are always absolute.

export type BreadcrumbItem = { name: string; path: string }

export function buildBreadcrumbList(items: ReadonlyArray<BreadcrumbItem>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  } as const
}

// --- Article ---------------------------------------------------------------
//
// For guide-style / comparison pages. We deliberately don't include
// author/publisher — Article is most useful here as a category hint
// for AI/Google ("this URL is an article-shaped resource, not a product
// page"), not as a news-article rich result, so we keep it minimal and
// pair it with the site-wide Organization + WebSite blocks.

export type ArticleArgs = {
  headline: string
  description: string
  canonicalPath: string // e.g. '/best-qr-code-app-for-campgrounds'
  datePublished: string // ISO date, e.g. '2026-06-02'
  dateModified?: string // optional; defaults to datePublished
  imagePath?: string // optional; usually the page's opengraph-image
}

export function buildArticle({
  headline,
  description,
  canonicalPath,
  datePublished,
  dateModified,
  imagePath,
}: ArticleArgs) {
  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE}${canonicalPath}`,
    },
    datePublished,
    dateModified: dateModified ?? datePublished,
    publisher: {
      '@type': 'Organization',
      name: 'RoadWave',
      url: SITE,
    },
  }
  if (imagePath) {
    article.image = `${SITE}${imagePath}`
  }
  return article
}
