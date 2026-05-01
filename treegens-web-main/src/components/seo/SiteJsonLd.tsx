import { siteMeta } from '@/config/siteMeta'

/**
 * Organization + WebSite JSON-LD for rich results (sameAs helps social panels).
 */
export function SiteJsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteMeta.name,
    alternateName: 'TreeGens growlation',
    url: siteMeta.url,
    logo: `${siteMeta.url}/img/treegens-logo.svg`,
    description: siteMeta.description,
    slogan: siteMeta.growlation,
    sameAs: [
      'https://x.com/treegens',
      'https://t.me/TreegenFam',
    ],
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteMeta.name,
    url: siteMeta.url,
    description: siteMeta.description,
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: siteMeta.name,
      url: siteMeta.url,
    },
  }

  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteMeta.name,
    url: siteMeta.url,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: siteMeta.description,
    browserRequirements: 'Requires JavaScript. Wallet & camera for full features.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApp),
        }}
      />
    </>
  )
}
