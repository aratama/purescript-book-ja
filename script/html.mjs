
import fs from 'fs-extra'
import util from 'util'
import glob from 'glob'
import cheerio from 'cheerio'
import { concatHtmls, writeHtml, renderMarkdown, readMarkdown, numberHeadings, insertPageBreak, insertNextChapterLink, insertLinkToHome, markdownToHtml, transformExercise, highlightCodes } from './render'

async function renderWithTemplate (path, content, template) {
  const $ = cheerio.load(template, { decodeEntities: false })
  $('.content').append(content('body > *'))
  await writeHtml(path, $)
}

async function main () {
  await fs.ensureDir('dist')
  const files = await util.promisify(glob)('src/chapter*.md')

  // load the template
  const template = await fs.readFile('templates/default.html', 'utf8')

  // render index page
  const indexDocument = await readMarkdown('src/index.md')
  await renderWithTemplate('dist/index.html', renderMarkdown(indexDocument), template)

  // render each chapters
  await Promise.all(files.map(async (file, i) => {
    const chapter = i + 1
    const document = await readMarkdown(file)
    numberHeadings(document, chapter)
    insertNextChapterLink(document, chapter, files.length - 1)
    insertLinkToHome(document)
    const $ = markdownToHtml(document)
    highlightCodes($)
    transformExercise($)
    await renderWithTemplate(`dist/chapter${(chapter).toString().padStart(2, '0')}.html`, $, template)
  }))

  // render integrated page
  const integrated = await Promise.all(files.map(async (file, i) => {
    const chapter = i + 1
    const document = await readMarkdown(file)
    numberHeadings(document, chapter)
    const $ = markdownToHtml(document)
    highlightCodes($)
    transformExercise($)
    insertPageBreak($)
    return $
  }))

  // render to file
  await renderWithTemplate('dist/purescript-book-ja.html', concatHtmls(integrated), template)

  // copy resources
  fs.copy('node_modules/github-markdown-css/github-markdown.css', 'dist/github-markdown.css')
}

main().catch(e => console.error(e))
