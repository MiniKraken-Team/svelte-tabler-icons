import * as fs from 'fs'
import * as path from 'path'

declare global {
  interface String {
    toPascalCase(): string
  }
}

String.prototype.toPascalCase = function () {
  return (this.match(/[a-zA-Z0-9]+/g) || [])
    .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
    .join('')
}

function generateIcons() {
  const svgContentMatcher = /<svg[^>]*>([\s\S]*?)<\/svg>/
  const tablerFolderPath = path.resolve('./node_modules/@tabler/icons/icons')
  const iconFolderPath = path.resolve('./icons')
  const indexFilePath = path.resolve('./index.js')
  const indexTypeFilePath = path.resolve('./index.d.ts')
  // get template
  const svelteTemplateContent = fs
    .readFileSync(path.resolve('./src/template/Icon.svelte'))
    .toString()
  // clear index file
  fs.writeFileSync(indexFilePath, '')
  // clear index typescript declaration file
  fs.writeFileSync(indexTypeFilePath, "import { SvelteComponentTyped } from 'svelte';")
  // get all icons from tabler package
  const files = fs.readdirSync(tablerFolderPath)

  files.forEach((file) => {
    const name = `Icon-${file.slice(0, -4).toPascalCase()}`
    const fileContent = fs.readFileSync(`${tablerFolderPath}/${file}`).toString()
    // fill in template + minify the svg a bit
    const transformedContent = svelteTemplateContent
      .replace(
        '$$SVG_CONTENT',
        fileContent.match(svgContentMatcher)![1].replace(/(?:\r\n|\r|\n)/g, '')
      )
      .replace('$$SVG_ARIA_LABEL', name)

    // create svelte file
    fs.writeFileSync(`${iconFolderPath}/${name}.svelte`, transformedContent)
    // append to index file
    fs.appendFileSync(
      indexFilePath,
      `export { default as ${name.replace('-', '')} } from './icons/${name}.svelte'\n`
    )
    // append index
    fs.appendFileSync(
      path.resolve('./index.d.ts'),
      `\nexport class ${name.replace(
        '-',
        ''
      )} extends SvelteComponentTyped<{\n  size?: string | number\n  color?: string\n  ariaLabel?: string\n  strokeWidth?: string | number\n  fillColor?: string\n}> {}`
    )
  })
}

export default generateIcons()
