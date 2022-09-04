import {
  readFileSync,
  existsSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  appendFileSync,
  rmSync,
} from 'fs'
import * as path from 'path'
import got from 'got'
import { Extract } from 'unzipper'

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

const svgContentMatcher = /<svg[^>]*>([\s\S]*?)<\/svg>/
const tablerFolderPath = path.resolve('./src/icons/icons')
const iconFolderPath = path.resolve('./icons')
const indexFilePath = path.resolve('./index.js')
const indexTypeFilePath = path.resolve('./index.d.ts')
const svelteTemplateContent = readFileSync(path.resolve('./src/template/Icon.svelte')).toString()
let version

function cleanup() {
  if (existsSync(path.resolve('./src/icons'))) {
    rmSync(path.resolve('./src/icons'), { recursive: true, force: true })
  }
}

async function getLatestIconsUrl(): Promise<string> {
  const releaseUrl = 'https://api.github.com/repos/tabler/tabler-icons/releases/latest'
  return await got
    .get(releaseUrl, {
      headers: {
        'User-Agent': 'Npm-Package',
      },
    })
    .then((response) => {
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        version = body.tag_name
        return body.assets[0].browser_download_url
      } else {
        console.error('Svelte-Tabler-Icons: Icons could not be downloaded, try again later')
        process.exit(1)
      }
    })
}

function downloadIcons(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (existsSync(path.resolve('./src/icons'))) {
      rmSync(path.resolve('./src/icons'), { recursive: true, force: true })
    }
    mkdirSync(path.resolve('./src/icons'))

    const downloadStream = got.stream(url)

    console.log('Svelte-Tabler-Icons: Downloading Latest Tabler Icons')
    downloadStream
      .on('downloadProgress', ({ transferred, total, percent }) => {
        if (!isNaN(total) && total > 0) {
          console.log(
            `Svelte-Tabler-Icons: progress: ${Math.round(transferred / 1000000)}Mb/${Math.round(
              total / 1000000
            )}Mb (${Math.round(percent * 100)}%)`
          )
        }
      })
      .on('error', (error) => {
        console.error(`Svelte-Tabler-Icons: Download failed: ${error.message}`)
        process.exit(1)
      })

    downloadStream
      .pipe(Extract({ path: path.resolve('./src/icons') }))
      .on('finish', () => {
        resolve(true)
      }) // not sure why you want to pass a boolean
      .on('error', reject)
  })
}

function generateIcons() {
  console.log('Svelte-Tabler-Icons: Generating Svelte Tabler Icons')

  // clear index file
  writeFileSync(indexFilePath, '')
  // clear index typescript declaration file
  writeFileSync(indexTypeFilePath, "import { SvelteComponentTyped } from 'svelte';")
  // make icons dir if not there (because of git ignore)
  if (existsSync(path.resolve('./icons'))) {
    rmSync(path.resolve('./icons'), { recursive: true, force: true })
  }
  mkdirSync(path.resolve('./icons'))

  readdirSync(tablerFolderPath).forEach((file) => {
    const name = `Icon-${file.slice(0, -4).toPascalCase()}`
    const fileContent = readFileSync(`${tablerFolderPath}/${file}`).toString()
    // fill in template + minify the svg a bit
    const transformedContent = svelteTemplateContent
      .replace(
        '$$SVG_CONTENT',
        fileContent.match(svgContentMatcher)![1].replace(/(?:\r\n|\r|\n)/g, '')
      )
      .replace('$$SVG_ARIA_LABEL', name)

    // create svelte file
    writeFileSync(`${iconFolderPath}/${name}.svelte`, transformedContent)
    // append to index file
    appendFileSync(
      indexFilePath,
      `export { default as ${name.replace('-', '')} } from './icons/${name}.svelte'\n`
    )
    // append index
    appendFileSync(
      path.resolve('./index.d.ts'),
      `\nexport class ${name.replace(
        '-',
        ''
      )} extends SvelteComponentTyped<{\n  size?: string | number\n  color?: string\n  ariaLabel?: string\n  strokeWidth?: string | number\n  fillColor?: string\n}> {}`
    )
  })
  setInstalledVersion()
  console.log('Svelte-Tabler-Icons: Svelte Tabler Icons generated from latest files')
}

function checkIfUpdateIsNeeded(): boolean {
  if (existsSync(path.resolve('./installed-version.json'))) {
    const versionInFile = JSON.parse(
      readFileSync(path.resolve('./installed-version.json')).toString()
    ).version
    if (version === versionInFile) {
      console.log('Svelte-Tabler-Icons: Icons Are Up to Date')
      return false
    } else return true
  }
  return true
}

function setInstalledVersion() {
  if (version) writeFileSync(path.resolve('./installed-version.json'), `{ "version":"${version}"}`)
}

async function run() {
  console.log('Svelte-Tabler-Icons: Starting Generation of Tabler Icons for Svelte')
  getLatestIconsUrl()
    .then((url) => {
      if (checkIfUpdateIsNeeded()) return downloadIcons(url)
      return false
    })
    .then((status) => {
      if (status) generateIcons()
      cleanup()
    })
    .catch((e) => {
      console.error(`Svelte-Tabler-Icons: ${e}`)
    })
}

export default run()
