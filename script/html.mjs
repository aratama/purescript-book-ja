
import fs from 'fs-extra'
import cp from 'child_process'
import util from 'util'
import glob from 'glob'

const globp = util.promisify(glob)
const execFilep = util.promisify(cp.execFile)

async function main(){

  await fs.ensureDir("dist")
  const files = await globp('src/chapter*.md')
  
  const child = await execFilep("pandoc", ["--from=markdown", "--to=html5", "--output=dist/index.html", "--template=./templates/default.html", "src/index.md"])
  if (child.stderr) {
    throw child.stderr
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i] 
    const name = /([^\\\/]*)$/.exec(file)[1];
    const number = parseInt(/^chapter([0-9]*?)\.md$/.exec(name)[1]) - 1;
    const chapter = `chapter${(number + 1).toString().padStart(2, "0")}`
    const c = await execFilep("pandoc", [
      "--from=markdown", 
      "--to=html5", 
      `--output=dist/${chapter}.html`, 
      "--number-sections", 
      '--number-offset', number, 
      "--template=./templates/default.html", 
      `src/${chapter}.md`
    ])
    if (c.stderr) {
      throw c.stderr
    }
  }

  const c = await execFilep("pandoc", [
    "--from=markdown", 
    "--to=html5", 
    "--number-sections", 
    "--output=dist/purescript-book-ja.html", 
    "--template=./templates/default.html"
  ].concat(files))
  if (c.stderr) {
    throw c.stderr
  }

  fs.copy('res/style.css', 'dist/style.css')
  fs.copy('res/logo-shadow.png', 'dist/logo-shadow.png')
  fs.copy('res/favicon-96x96.png', 'dist/favicon-96x96.png') 
  fs.copy('node_modules/github-markdown-css/github-markdown.css', 'dist/github-markdown.css')

}

main().catch(e => console.error(e))