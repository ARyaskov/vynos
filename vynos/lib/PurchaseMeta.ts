export default interface PurchaseMeta {
  title: string
  description: string
  icon?: string
  siteName: string
  siteIcon?: string
  url: string
  origin: string
}

function openGraph(attribute: string, document: HTMLDocument): string {
  const targetProperty = `og:${attribute}`
  const metaTags = document.getElementsByTagName("meta")
  for (const metaTag of Array.from(metaTags)) {
    if (metaTag.getAttribute("property") === targetProperty) {
      return metaTag.getAttribute("content") || ""
    }
  }
  return ""
}

function appleTouchIcon(document: HTMLDocument): string | undefined {
  let links = Array.from(document.getElementsByTagName("link")) as Array<HTMLLinkElement>
  let icons = links.filter((link) => /apple-touch-icon/.test(link.rel))
  if (icons.length) {
    let maxSize = icons.reduce((acc, link) => {
      let size = parseInt(link.getAttribute("sizes") as string, 10) || 0
      if (size > parseInt(acc.getAttribute("sizes") as string, 10)) {
        return link
      } else {
        return acc
      }
    })
    return maxSize.href
  }
}

function icon(document: HTMLDocument): string | undefined {
  let links = Array.from(document.getElementsByTagName("link")) as Array<HTMLLinkElement>
  let found = links.find((link) => {
    return /icon/.test(link.rel) && (!link.type || link.type !== "image/x-icon") && !/shortcut/.test(link.rel) && /\.png|\.jpg/.test(link.href)
  })
  if (found) {
    return found.href
  }
}

function openGraphIcon(document: HTMLDocument): string | undefined {
  const metaTags = Array.from(document.getElementsByTagName("meta")) as Array<HTMLMetaElement>
  let ogLinks = metaTags.filter((metaTag) => metaTag.getAttribute("property") === "og:image")
  if (ogLinks.length) {
    let found = ogLinks.find((link) => {
      return /logo|icon/.test(link.content)
    })
    if (found) {
      return found.content
    } else {
      return ogLinks[0].content
    }
  }
}

export function purchaseMetaFromDocument(document: HTMLDocument): PurchaseMeta {
  return {
    title: openGraph("title", document),
    description: openGraph("description", document),
    siteName: openGraph("site_name", document),
    url: document.location.href,
    origin: document.location.origin,
    icon: openGraphIcon(document),
    siteIcon: appleTouchIcon(document) || icon(document)
  }
}
