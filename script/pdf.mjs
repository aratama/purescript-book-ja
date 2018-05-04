import puppeteer from 'puppeteer'

async function main () {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(`file:///${process.cwd()}/dist/purescript-book-ja.html`)
  await page.pdf({
    path: './dist/purescript-book-ja.pdf',
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      left: '0.35cm'
    }
  })
  await browser.close()
}

main()
