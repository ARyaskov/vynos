export function resource(relativePath: string) {
  const url = new URL(process.env.EMBED_ADDRESS || window.location.href)
  const normalizedPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`

  if (normalizedPath.startsWith("/frame/")) {
    url.pathname = `/vynos${normalizedPath}`
    return url.toString()
  }

  let pathname = url.pathname.replace(/\/[\w.]+$/, "/")
  pathname = `${pathname}${normalizedPath}`.replace(/\/{2,}/g, "/")
  url.pathname = pathname
  return url.toString()
}

export function isTokenContractDefined(tokenContract: string | undefined): boolean {
  // tslint:disable-next-line:strict-type-predicates
  return tokenContract !== undefined && tokenContract !== null && tokenContract.startsWith("0x") && parseInt(tokenContract, 16) !== 0
}
