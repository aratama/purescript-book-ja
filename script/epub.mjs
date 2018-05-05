
import util from 'util'
import glob from 'glob'
import Epub from 'epub-gen'
import { renderMarkdown, readMarkdown } from './render'

async function main () {
  const files = await util.promisify(glob)('src/chapter*.md')
  const css = await util.promisify(glob)('node_modules/github-markdown-css/github-markdown.css', 'utf8')
  const chapters = await Promise.all(files.map(async (file, i) => {
    const buffer = await readMarkdown(file)
    const html = renderMarkdown(buffer, { chapter: i + 1, lastChapter: null, homeLinks: false })
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
