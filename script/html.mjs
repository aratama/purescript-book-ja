
import fs from 'fs-extra'
import cp from 'child_process'
import util from 'util'
import glob from 'glob'

const globp = util.promisify(glob)
const execFilep = util.promisify(cp.execFile)

process.stdout.setMaxListeners(16)
process.stderr.setMaxListeners(16)

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
    const c = cp.spawn("pandoc", [
      "--from=markdown", 
      "--to=html5", 
      `--output=dist/${chapter}.html`, 
      "--number-sections", 
      '--number-offset', number, 
      "--template=./templates/default.html"
    ])
 
    c.stdin.setEncoding('utf-8');
    c.stdout.pipe(process.stdout);
    c.stderr.pipe(process.stderr);    

    
    const content = await fs.readFile(file)
    c.stdin.write(`<p class="home"><a href="index.html">&lt; 目次に戻る</a></p>\n`);       
    c.stdin.write(content);
    c.stdin.write("\n");   
    
    if (i < files.length - 1) {
      const next = i + 2
      c.stdin.write(`<a href="chapter${next.toString().padStart(2, "0")}.html"><div class="next">次の第${next}章を読む</div></a>\n`)
    }

    c.stdin.write(`<p class="home"><a href="index.html">&lt; 目次に戻る</a></p>\n`);

    c.stdin.end(); 
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

  fs.copy('node_modules/github-markdown-css/github-markdown.css', 'dist/github-markdown.css')
}

main().catch(e => console.error(e))