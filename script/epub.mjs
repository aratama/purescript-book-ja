
import fs from 'fs-extra'
import util from 'util'
import glob from 'glob'
import Epub from 'epub-gen'
import { renderMarkdown } from './render'

async function main () {
  const files = await util.promisify(glob)('src/chapter*.md')

  const cssBuffer = await util.promisify(glob)('node_modules/github-markdown-css/github-markdown.css')
  const css = cssBuffer.toString()

  const chapters = await Promise.all(files.map(async (file, i) => {
    const buffer = await fs.readFile(file)
    const html = renderMarkdown(i + 1, null, buffer.toString(), false)
    return {
      title: `chapter${(i + 1).toString().padStart(2, '0')}`,
      data: html,
      css: css
    }
  }))

  await new Epub({
    title: '実例によるPureScript',
    author: 'Phil Freeman',
    cover: './res/cover.png',
    content: chapters
  }, './dist/purescript-book-ja.epub')
}

main().catch(e => console.error(e))
