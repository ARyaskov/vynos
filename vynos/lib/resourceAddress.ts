export function embed(scriptElement?: HTMLScriptElement | null): string {
  if (scriptElement instanceof HTMLScriptElement) {
    return scriptElement.src
  } else {
    return process.env.EMBED_ADDRESS || ""
  }
}

export function frameHtml(baseAddress: string): string {
  const fallback = baseAddress.replace(/\/?vynos\.js$/, "/vynos/frame/frame.html")

  try {
    const url = new URL(baseAddress)
    url.pathname = url.pathname.replace(/\/?vynos\.js$/, "/vynos/frame/frame.html")
    return url.toString()
  } catch {
    return fallback
  }
}
