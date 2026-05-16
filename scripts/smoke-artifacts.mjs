import { access, stat } from "node:fs/promises"
import { constants } from "node:fs"
import path from "node:path"

const requiredFiles = [
  "dist/frame.js",
  "dist/worker.js",
  "dist/vynos.js",
  "dist/index.js",
  "dist/harness.js",
  "dist/vynos/frame/frame.html",
  "dist/harness/index.html"
]

async function assertFileExists(relativePath) {
  const absolutePath = path.resolve(relativePath)
  await access(absolutePath, constants.R_OK)
  const fileStat = await stat(absolutePath)
  if (!fileStat.isFile()) {
    throw new Error(`Expected file but found non-file: ${relativePath}`)
  }
  if (fileStat.size <= 0) {
    throw new Error(`File is empty: ${relativePath}`)
  }
}

async function main() {
  for (const filePath of requiredFiles) {
    await assertFileExists(filePath)
  }
  process.stdout.write("Smoke artifacts check passed\n")
}

main().catch((error) => {
  process.stderr.write(`Smoke artifacts check failed: ${String(error)}\n`)
  process.exitCode = 1
})
