import commonmark from "commonmark";
import cheerio from "cheerio";
import highlightjs from "highlightjs";
import fs from "fs-extra";

export async function readMarkdown(path) {
  const content = await fs.readFile(path, "utf8");
  const reader = new commonmark.Parser();
  return reader.parse(content);
}

export function numberHeadings(document, chapter) {
  let sectionCounter = 1;
  let chapterTitle = null;
  let sections = [];
  for (let child = document.firstChild; child; child = child.next) {
    if (child.type === "heading") {
      if (child.level === 1) {
        chapterTitle = child.firstChild.literal;
        const text = new commonmark.Node("text");
        text.literal = `第${chapter}章 `;
        child.prependChild(text);
        sectionCounter = 1;
      } else if (child.level === 2) {
        const text = child.firstChild.literal.trim();
        if (text !== "まとめ" && text.indexOf("演習") < 0) {
          sections.push(child.firstChild.literal);
          const text = new commonmark.Node("text");
          text.literal = chapter + "." + sectionCounter + " ";
          child.prependChild(text);
          sectionCounter += 1;
        }
      }
    }
  }
  return { chapterTitle, sections };
}

export function insertNextChapterLink(document, chapter, lastChapter) {
  // insert link to the next chapter
  if (chapter !== null && lastChapter !== null && chapter < lastChapter) {
    const nextChapter = chapter + 1;
    const nextChapterLink = new commonmark.Node("html_block");
    const chapterName = `chapter${nextChapter.toString().padStart(2, "0")}`;
    nextChapterLink.literal = `\n\n<a href="${chapterName}.html"><div class="next">次の第${nextChapter}章を読む</div></a>`;
    document.appendChild(nextChapterLink);
  }
}

export function insertLinkToHome(document) {
  const home = () => {
    const home = new commonmark.Node("html_block");
    home.literal = `<p class="home"><a href="index.html">目次に戻る</a></p>`;
    return home;
  };
  document.appendChild(home());
  document.prependChild(home());
}

export function highlightCodes($) {
  $(
    `pre code[class="language-haskell"], pre code[class="language-purescript"], pre code[class="language-javascript"]`
  ).map((i, node) => {
    const result = highlightjs.highlightAuto($(node).text(), [
      "haskell",
      "javascript"
    ]);
    $(node).text(result.value);
  });
}

export function transformExercise($) {
  $(`h2`).each((i, element) => {
    if (
      $(element)
        .text()
        .trim() === "演習"
    ) {
      const div = $(`<div class="exercise"><h2>演習</h2></div>`);

      for (
        let child = $(element).next();
        child.length > 0;
        child = child.next()
      ) {
        // debugger
        if (child.is("h1, h2, h3, h4, h5, h6")) {
          break;
        } else {
          div.append(child);
        }
      }

      $(element).replaceWith(div);
    }
  });
}

export function markdownToHtml(document) {
  const writer = new commonmark.HtmlRenderer();
  try {
    const rendered = writer.render(document); // result is a String
    return cheerio.load(rendered, { decodeEntities: false });
  } catch (e) {
    debugger;
    const rendered = writer.render(document); // result is a String
    return cheerio.load(rendered, { decodeEntities: false });
  }
}

// renderMarkdown :: Markdown -> String
export function renderMarkdown(document, options) {
  const chapter = (options && options.chapter) || null;
  const lastChapter = (options && options.lastChapter) || null;
  const homeLinks = (options && options.homeLinks) || false;

  // insert link to the next chapter
  insertNextChapterLink(document, chapter, lastChapter);

  // insert link to home
  if (homeLinks) {
    insertLinkToHome(document);
  }

  // render mamrkdown nodes to html html nodes
  const $ = markdownToHtml(document);

  // highlight codes
  highlightCodes($);

  // transform exercise
  transformExercise($);

  // render to html text
  return $;
}

export async function writeHtml(path, $) {
  await fs.writeFile(path, $.html());
}

export function insertPageBreak($) {
  $("body").append($(`<div class="pagebreak"></div>`));
}

export function concatHtmls(htmls) {
  const head = htmls.shift();
  for (let i = 0; i < htmls.length; i++) {
    const $ = htmls[i];
    head("body").append($("body > *"));
  }
  return head;
}
