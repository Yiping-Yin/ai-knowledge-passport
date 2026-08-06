from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

OUT = Path("algothon_leaderboard_snapshot")
OUT.mkdir(parents=True, exist_ok=True)
TARGETS = (
    "https://www.algothon.au/leaderboard",
    "https://www.algothon.au/",
)


def safe_name(url: str, suffix: str) -> str:
    parsed = urlparse(url)
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{parsed.netloc}{parsed.path}").strip("_")
    return f"{stem}_{hashlib.sha256(url.encode()).hexdigest()[:12]}.{suffix}"


def main() -> None:
    responses: list[dict] = []
    console: list[dict] = []
    failures: list[dict] = []
    page_errors: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="en-AU",
            timezone_id="Australia/Sydney",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        page.on("console", lambda msg: console.append({"type": msg.type, "text": msg.text}))
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.on(
            "requestfailed",
            lambda req: failures.append(
                {"url": req.url, "method": req.method, "failure": req.failure}
            ),
        )

        def capture_response(resp):
            content_type = resp.headers.get("content-type", "")
            row = {
                "url": resp.url,
                "status": resp.status,
                "content_type": content_type,
                "headers": dict(resp.headers),
            }
            lower_url = resp.url.lower()
            interesting = (
                "json" in content_type.lower()
                or any(key in lower_url for key in ("leader", "score", "rank", "api", "supabase", "firebase", "graphql"))
            )
            if interesting:
                try:
                    body = resp.body()
                    row["body_bytes"] = len(body)
                    if len(body) <= 10_000_000:
                        suffix = "json" if "json" in content_type.lower() else "bin"
                        path = OUT / safe_name(resp.url, suffix)
                        path.write_bytes(body)
                        row["saved_as"] = str(path)
                        if suffix == "json":
                            try:
                                row["json"] = json.loads(body)
                            except Exception:
                                row["preview"] = body[:5000].decode("utf-8", "replace")
                except Exception as exc:
                    row["body_error"] = repr(exc)
            responses.append(row)

        page.on("response", capture_response)

        navigation_errors = []
        loaded = False
        for target in TARGETS:
            try:
                page.goto(target, wait_until="domcontentloaded", timeout=120_000)
                try:
                    page.wait_for_load_state("networkidle", timeout=60_000)
                except PlaywrightTimeoutError:
                    pass
                page.wait_for_timeout(10_000)
                loaded = True
                break
            except Exception as exc:
                navigation_errors.append({"target": target, "error": repr(exc)})

        if not loaded:
            raise RuntimeError(f"Could not load Algothon: {navigation_errors}")

        # Click likely leaderboard navigation if present, then scroll through the page.
        for label in ("Leaderboard", "LEADERBOARD"):
            try:
                loc = page.get_by_text(label, exact=True).first
                if loc.count():
                    loc.click(timeout=5_000)
                    page.wait_for_timeout(3_000)
                    break
            except Exception:
                pass
        for _ in range(18):
            page.mouse.wheel(0, 1200)
            page.wait_for_timeout(250)
        page.wait_for_timeout(5_000)

        body_text = page.locator("body").inner_text(timeout=30_000)
        html = page.content()
        (OUT / "body.txt").write_text(body_text, encoding="utf-8")
        (OUT / "page.html").write_text(html, encoding="utf-8")
        page.screenshot(path=str(OUT / "full_page.png"), full_page=True)

        extraction = page.evaluate(
            """
            () => {
              const text = (el) => (el?.innerText || el?.textContent || '').trim();
              const all = [...document.querySelectorAll('body *')];
              const headerHits = all.filter(el => {
                const t = text(el);
                return el.childElementCount === 0 && ['Rank','Team','Score','Mean PL','StdDev PL'].includes(t);
              });
              const containers = [];
              const seen = new Set();
              for (const hit of headerHits) {
                let el = hit;
                for (let depth = 0; depth < 12 && el; depth++, el = el.parentElement) {
                  const t = text(el);
                  if (t.includes('Rank') && t.includes('Team') && t.includes('Score') && t.includes('Mean PL') && t.includes('StdDev PL')) {
                    const key = t.slice(0, 10000);
                    if (!seen.has(key)) {
                      seen.add(key);
                      containers.push({
                        tag: el.tagName,
                        id: el.id || '',
                        className: typeof el.className === 'string' ? el.className : '',
                        text: t,
                        html: el.outerHTML.slice(0, 500000),
                      });
                    }
                    break;
                  }
                }
              }
              const tables = [...document.querySelectorAll('table')].map((table, index) => ({
                index,
                text: text(table),
                rows: [...table.querySelectorAll('tr')].map(tr =>
                  [...tr.querySelectorAll('th,td')].map(cell => text(cell))
                ),
              }));
              const resources = performance.getEntriesByType('resource').map(r => ({
                name: r.name,
                initiatorType: r.initiatorType,
              }));
              return {containers, tables, resources};
            }
            """
        )
        (OUT / "extraction.json").write_text(
            json.dumps(extraction, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        metadata = {
            "captured_at_utc": datetime.now(timezone.utc).isoformat(),
            "final_url": page.url,
            "title": page.title(),
            "navigation_errors": navigation_errors,
            "cookies": context.cookies(),
            "console": console,
            "page_errors": page_errors,
            "request_failures": failures,
            "responses": responses,
        }
        (OUT / "metadata.json").write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )
        browser.close()

    print(json.dumps({
        "out": str(OUT),
        "body_chars": len(body_text),
        "containers": len(extraction["containers"]),
        "tables": len(extraction["tables"]),
        "responses": len(responses),
    }, indent=2))


if __name__ == "__main__":
    main()
