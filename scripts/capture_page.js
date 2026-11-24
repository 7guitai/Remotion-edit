// 公式ページを撮影して public/shorts/<short>/shots/<name>.png に保存し、
// 強調したい文字（focus）を含む要素の位置を src/shorts/<short>/shots.json に追記する。
// 使い方: node scripts/capture_page.js <short> <name> <url> [スクロール先の文字] [強調する文字...]
// 例:     node scripts/capture_page.js gemini-mac blog https://blog.google/... "Let Gemini" "Nov 19, 2026"
// 撮影前にボタン等を開くとき: CLICK="More Information" node scripts/capture_page.js ...
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [short, name, url, scrollText, ...focus] = process.argv.slice(2);
if (!short || !name || !url) {
  console.error("使い方: node scripts/capture_page.js <short> <name> <url> [スクロール先の文字] [強調する文字...]");
  process.exit(1);
}
const outDir = path.join(__dirname, "..", "public", "shorts", short, "shots");
const metaPath = path.join(__dirname, "..", "src", "shorts", short, "shots.json");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(2500);
  for (const label of ["OK, got it", "OK", "Accept all", "同意する", "すべて受け入れる"]) {
    const b = p.getByRole("button", { name: label, exact: true });
    if (await b.count()) await b.first().click({ timeout: 1500 }).catch(() => {});
  }
  if (process.env.CLICK) {
    await p.getByText(process.env.CLICK, { exact: true }).first().click({ timeout: 5000 });
    await p.waitForTimeout(1200);
  }
  // 追従ヘッダー・バナーを消す
  await p.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") el.style.setProperty("display", "none", "important");
    }
  });
  const find = (t) =>
    p.evaluate((t) => {
      // その文字を含む要素のうち、いちばん小さいもの（リンクや脚注番号を含む段落にも対応）
      const els = [...document.querySelectorAll("h1,h2,h3,h4,p,span,li,time,a,div,sup,small")].filter(
        (e) => e.textContent.includes(t) && e.getBoundingClientRect().height > 0,
      );
      if (!els.length) return null;
      els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
      const r = els[0].getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    }, t);
  let scrollY = 0;
  if (scrollText) {
    const a = await find(scrollText);
    if (!a) throw new Error(`見つからない: ${scrollText}`);
    scrollY = Math.max(0, a.y - 60);
  }
  await p.evaluate((y) => window.scrollTo(0, y), scrollY);
  await p.waitForTimeout(1500);
  scrollY = await p.evaluate(() => window.scrollY);
  await p.screenshot({ path: path.join(outDir, `${name}.png`) });
  const boxes = {};
  for (const f of focus) {
    const b = await find(f);
    if (b) boxes[f] = { x: b.x / 1280, y: (b.y - scrollY) / 860, w: b.w / 1280, h: b.h / 860 };
    else console.warn("強調する文字が見つからない:", f);
  }
  await browser.close();
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};
  meta[name] = { url, boxes };
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1) + "\n");
  console.log(name, JSON.stringify(boxes));
})();
