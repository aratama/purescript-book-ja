
import fs from 'fs-extra'
import util from 'util'
import glob from 'glob'
import cheerio from 'cheerio'
import { renderMarkdown } from './render'

function renderWithTemplate (content, template) {
  const $ = cheerio.load(template, { decodeEntities: false })
  $('.content').append(content)
  return $.html()
}

async function main () {
  await fs.ensureDir('dist')
  const files = await util.promisify(glob)('src/chapter*.md')

  // load the template
  const templateBuffer = await fs.readFile('templates/default.html')
  const template = templateBuffer.toString()

  // render index page
  const indexContentBuffer = await fs.readFile('src/index.md')
  const indexRendered = renderMarkdown(null, null, indexContentBuffer.toString(), false)
  const indexPage = renderWithTemplate(indexRendered, template)
  await fs.writeFile('dist/index.html', indexPage)

  // render chapters
  const chapters = await Promise.all(files.map(async (file, i) => {
    const chapter = i + 1
    const contentBuffer = await fs.readFile(file)
    const content = contentBuffer.toString()
    const rendered = renderMarkdown(chapter, files.length - 1, content, true)

    // render with template
    const page = renderWithTemplate(rendered, template)
    await fs.writeFile(`dist/chapter${(chapter).toString().padStart(2, '0')}.html`, page)
    return content
  }))

  // render integrated page
  const renderedChapters = await Promise.all(chapters.map(async (content, i) => {
    return renderMarkdown(i + 1, null, content, false)
  }))

  const all = renderedChapters.map(chapter => chapter + `\n<div class="pagebreak"></div>\n`).concat()
  const page = renderWithTemplate(all, template)
  await fs.writeFile('dist/purescript-book-ja.html', page)

  fs.copy('node_modules/github-markdown-css/github-markdown.css', 'dist/github-markdown.css')
}

main().catch(e => console.error(e))
