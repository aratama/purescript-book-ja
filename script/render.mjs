import fs from 'fs-extra'
import cp from 'child_process'
import util from 'util'
import glob from 'glob'
import commonmark from 'commonmark'
import cheerio from 'cheerio'
import highlightjs from 'highlightjs'

export function renderMarkdown(chapter, lastChapter, content, homeLinks){

  // render markdown to nodes
  const reader = new commonmark.Parser();
  const document = reader.parse(content) // parsed is a 'Node' tree

  // numbering sections
  if (chapter !== null) {
    let sectionCounter = 1;
    for(let child = document.firstChild; child; child = child.next){
      if(child.type === "heading"){
        if(child.level === 1){
          const text = new commonmark.Node("text")
          text.literal = `第${chapter}章 `
          child.prependChild(text)
          let sectionCounter = 1;
        }else if(child.level === 2){
          const text = child.firstChild.literal.trim()
          if (text !== "まとめ" && text.indexOf("演習") < 0){
            const text = new commonmark.Node("text")
            text.literal = chapter + "." + sectionCounter + " "
            child.prependChild(text)
            sectionCounter += 1 
          }    
        }
      }
    }
  }

  // insert link to the next chapter
  if (chapter !== null && lastChapter !== null && chapter < lastChapter) {
    const nextChapter = chapter + 1
    const nextChapterLink = new commonmark.Node("html_block")
    nextChapterLink.literal = `\n\n<a href="chapter${nextChapter.toString().padStart(2, "0")}.html"><div class="next">次の第${nextChapter}章を読む</div></a>`
    document.appendChild(nextChapterLink)
  }

  // insert link to home
  if(homeLinks){
    const home = () => {
      const home = new commonmark.Node("html_block")
      home.literal = `<p class="home"><a href="index.html">目次に戻る</a></p>`
      return home
    }
    document.appendChild(home())
    document.prependChild(home())
  }

  // render nodes to html 
  const writer = new commonmark.HtmlRenderer()
  const rendered = writer.render(document) // result is a String

  // highlight codes
  const $ = cheerio.load(rendered)
  $(`pre code[class="language-haskell"], pre code[class="language-purescript"], pre code[class="language-javascript"]`).map((i, node)  => {
    const result = highlightjs.highlightAuto($(node).text(), ["haskell", "javascript"])
    $(node).text(result.value)
  })

  $(`h2`).each((i, element) => {
    if($(element).text().trim() === "演習") {

      const div = $(`<div class="exercise"><h2>演習</h2></div>`)

      const children = []
      for(let child = $(element).next(); 0 < child.length; child = child.next()){
        //debugger
        if(child.is("h1, h2, h3, h4, h5, h6")){
          break;
        }else{
          div.append(child)
        }
      }

      $(element).replaceWith(div)
    }
  })

  return $.html()
}