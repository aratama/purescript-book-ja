import fs from "fs-extra";
import util from "util";
import glob from "glob";
import cheerio from "cheerio";
import {
  concatHtmls,
  writeHtml,
  renderMarkdown,
  readMarkdown,
  numberHeadings,
  insertPageBreak,
  insertNextChapterLink,
  insertLinkToHome,
  markdownToHtml,
  transformExercise,
  highlightCodes
} from "./render";
import commonmark from "commonmark";

async function renderWithTemplate(path, content, template) {
  const $ = cheerio.load(template, { decodeEntities: false });
  $(".content").append(content("body > *"));
  await writeHtml(path, $);
}

async function main() {
  debugger;
  await fs.ensureDir("dist");
  const files = await util.promisify(glob)("src/chapter*.md");

  // load the template
  const template = await fs.readFile("templates/default.html", "utf8");

  // render each chapters
  const chapters = await Promise.all(
    files.map(async (file, i) => {
      const chapter = i + 1;
      const document = await readMarkdown(file);
      let result = numberHeadings(document, chapter);
      insertNextChapterLink(document, chapter, files.length - 1);
      insertLinkToHome(document);
      const $ = markdownToHtml(document);
      highlightCodes($);
      transformExercise($);
      await renderWithTemplate(
        `dist/chapter${chapter.toString().padStart(2, "0")}.html`,
        $,
        template
      );
      return result;
    })
  );

  // render index page
  const indexDocument = await readMarkdown("src/index.md");
  for (let child = indexDocument.firstChild; child; child = child.next) {
    if (child.type === "heading" && child.firstChild.literal === "目次") {
      const list = new commonmark.Node("list");
      list.listType = commonmark.Ordered;
      list.listTight = true;
      list.listStart = 1;
      list.listDelimiter = ".";

      chapters.forEach((chapter, i) => {
        const text = new commonmark.Node("text");
        text.literal = chapter.chapterTitle;

        const link = new commonmark.Node("link");
        link.appendChild(text);
        link.destination = `chapter${(i + 1).toString().padStart(2, "0")}.html`;

        const item = new commonmark.Node("item");
        item.appendChild(link);

        list.appendChild(item);

        const slist = new commonmark.Node("list");
        slist.listType = commonmark.Ordered;
        slist.listTight = true;
        slist.listStart = 1;
        slist.listDelimiter = ".";

        chapter.sections.forEach((section, j) => {
          const text = new commonmark.Node("text");
          text.literal = section;

          const item = new commonmark.Node("item");
          item.appendChild(text);
          slist.appendChild(item);
        });

        list.appendChild(slist);
      });

      child.insertAfter(list);
    }
  }
  await renderWithTemplate(
    "dist/index.html",
    renderMarkdown(indexDocument),
    template
  );

  // render integrated page
  const integrated = await Promise.all(
    files.map(async (file, i) => {
      const chapter = i + 1;
      const document = await readMarkdown(file);
      numberHeadings(document, chapter);
      const $ = markdownToHtml(document);
      highlightCodes($);
      transformExercise($);
      insertPageBreak($);
      return $;
    })
  );

  // render to file
  await renderWithTemplate(
    "dist/purescript-book-ja.html",
    concatHtmls(integrated),
    template
  );

  // copy resources
  fs.copy(
    "node_modules/github-markdown-css/github-markdown.css",
    "dist/github-markdown.css"
  );
}

main();
