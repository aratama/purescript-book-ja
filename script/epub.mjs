
import fs from 'fs-extra'
import cp from 'child_process'
import util from 'util'
import glob from 'glob'

const globp = util.promisify(glob)
const execFilep = util.promisify(cp.execFile)

async function main(){

  await fs.ensureDir("dist")
  const files = await globp('src/chapter*.md')
  
  const c = await execFilep("pandoc", [
    "--from=markdown", 
    "--to=epub3", 
    "--output=./dist/purescript-book-ja.epub", 
    "--template=./templates/default.epub", 
    '--epub-stylesheet', 'node_modules/github-markdown-css/github-markdown.css', 
    '--epub-metadata=./res/metadata.xml', 
    '--epub-cover-image=./res/cover.png'
  ].concat(files))
  if (c.stderr) {
    throw c.stderr
  }
}

main().catch(e => console.error(e))