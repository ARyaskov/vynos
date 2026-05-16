declare module "browser-passworder"
declare module "*.css" {
  const classes: Record<string, string>
  export default classes
}
declare module "*.css?module" {
  const classes: Record<string, string>
  export default classes
}
declare module "*.svg" {
  const src: string
  export default src
}

interface Navigator {
  msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean
  msSaveBlob?: (blob: Blob, defaultName?: string) => boolean
}
