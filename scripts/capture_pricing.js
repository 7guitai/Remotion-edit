// 各社の公式料金ページを撮影して public/shorts/<id>/shots/ に保存し、
// 強調したいプランのカード位置を shots.json に書き出す（動画内で枠を付けてズームする）。
// 使い方: node scripts/capture_pricing.js ai-subscription
// ※ 撮影する国によって表示通貨が変わる。Google One は日本語版（円）を指定している。
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const short = process.argv[2] || "ai-subscription";
const outDir = path.join(__dirname, "..", "public", "shorts", short, "shots");
fs.mkdirSync(outDir, { recursive: true });

const TARGETS = [
  { name: "chatgpt", url: "https://chatgpt.com/ja-JP/pricing/", focus: ["Plus"], scrollTo: "Plus" },
  { name: "claude", url: "https://claude.com/pricing", focus: ["Pro"], scrollTo: "Pro" },
  { name: "google", url: "https://one.google.com/intl/ja/about/google-ai-plans/?hl=ja&gl=JP", focus: ["Google AI Plus", "Google AI Pro"], scrollTo: "Google AI Plus" },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  });
  const meta = {};
  for (const t of TARGETS) {
    const p = await ctx.newPage();
    await p.goto(t.url, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(2500);
    // クッキー同意・お知らせを閉じる
    for (const label of ["OK, got it", "OK", "同意する", "すべて受け入れる"]) {
      const b = p.getByRole("button", { name: label, exact: true });
      if (await b.count()) await b.first().click({ timeout: 1500 }).catch(() => {});
    }
    for (const sel of ['button[aria-label="閉じる"]', 'button[aria-label="Close"]', 'button[aria-label="Dismiss"]']) {
      const c = p.locator(sel);
      for (let i = 0; i < (await c.count()); i++) await c.nth(i).click({ timeout: 800 }).catch(() => {});
    }
    // 画面下に出る小さなお知らせ（ChatGPT のアカデミックプラン案内など）は隠す
    await p.addStyleTag({ content: '[class*="toast" i],[class*="banner" i][class*="bottom" i]{display:none!important}' });
    const findCard = (label) =>
      p.evaluate((label) => {
        const leaves = [...document.querySelectorAll("h1,h2,h3,h4,h5,p,span,div")].filter(
          (e) => e.children.length === 0 && e.textContent.trim() === label && e.getBoundingClientRect().height > 0,
        );
        for (const leaf of leaves) {
          let el = leaf;
          while (el && el.parentElement) {
            const r = el.getBoundingClientRect();
            if (r.width > 180 && r.width < 520 && r.height > 280) {
              return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
            }
            el = el.parentElement;
          }
        }
        return null;
      }, label);
    // スクロールしても追従するヘッダーやお知らせがカードに重なるので消す
    await p.evaluate(() => {
      for (const el of document.querySelectorAll("body *")) {
        const pos = getComputedStyle(el).position;
        if (pos === "fixed" || pos === "sticky") el.style.setProperty("display", "none", "important");
      }
    });
    await p.waitForTimeout(500);
    const anchor = await findCard(t.scrollTo);
    if (!anchor) throw new Error(`${t.name}: ${t.scrollTo} のカードが見つからない`);
    const scrollY = Math.max(0, anchor.y - 40);
    await p.evaluate((y) => window.scrollTo(0, y), scrollY);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(outDir, `${t.name}.png`) });
    const boxes = {};
    for (const f of t.focus) {
      const b = await findCard(f);
      if (b) boxes[f] = { x: b.x / 1280, y: (b.y - scrollY) / 860, w: b.w / 1280, h: b.h / 860 };
    }
    meta[t.name] = { url: t.url, boxes };
    console.log(t.name, JSON.stringify(boxes));
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, "..", "src", "shorts", short, "shots.json"), JSON.stringify(meta, null, 1) + "\n");
})();
