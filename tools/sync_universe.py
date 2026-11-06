#!/usr/bin/env python3
"""Feed Nhi's Universe from the Obsidian vault and NewsTrace.

    python3 tools/sync_universe.py            # write files, then review `git diff`
    python3 tools/sync_universe.py --dry-run  # only list what would be published
    python3 tools/sync_universe.py --no-news  # skip NewsTrace, keep the last newsstand

Nothing leaves the vault unless the note opts in through its frontmatter:

    publish: library        # a Library page (`publish: true` means the same)
    shelf: probability      # which shelf: an `id` from CONTENT.library in js/content.js
    desc: One line for the shelf list (optional; defaults to the first paragraph)

    publish: desk           # a line on the "now working on" computer in Nhi's House
    summary: One line about it
    link: https://...       (optional)

Wikilinks are rendered as plain text, so a published note never exposes the names
of private notes it links to. Notes under the folders in PRIVATE are refused even
when they opt in.

Outputs (both generated, both safe to overwrite):
    universe/library/notes/<slug>.html   one page per published Library note
    universe/js/vault-data.js            shelf entries, desk items and the newsstand
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
VAULT = Path.home() / "Documents" / "Obsidian Vault"
NEWSTRACE = Path.home() / "Documents" / "GitHub" / "newTrace"
NOTES_DIR = SITE / "universe" / "library" / "notes"
DATA_FILE = SITE / "universe" / "js" / "vault-data.js"
PRIVATE = ("+", "AIOS", "Calendar", "Efforts/Projects/Applications", ".claude", ".obsidian", "x")
NEWS_TOPICS = ["ai_safety", "ai_models", "preprints"]
# Topic feeds are broad (gadgets, breaches, finance preprints); the stand only shows AI stories.
AI_RE = re.compile(r"\b(AI|A\.I\.|artificial intelligence|LLMs?|language models?|machine learning|neural|OpenAI|Anthropic|DeepMind|Gemini|Claude|ChatGPT|GPT-?\d*|chatbots?|AI agents?|alignment|deepfakes?)\b", re.I)
SHELVES_RE = re.compile(r'\{\s*id:\s*"([^"]+)"\s*,\s*title:')
MARK = "/*DATA*/"

# --------------------------------------------------------------------------- vault


def frontmatter(text: str) -> tuple[dict[str, object], str]:
    """Parse the small YAML subset Obsidian properties use; return (meta, body)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end < 0:
        return {}, text
    meta: dict[str, object] = {}
    key = None
    for line in text[4:end].splitlines():
        if re.match(r"^\s+-\s", line) and key:
            value = meta.get(key)
            items = value if isinstance(value, list) else []
            items.append(line.split("-", 1)[1].strip().strip("\"'"))
            meta[key] = items
            continue
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m:
            key, raw = m.group(1), m.group(2).strip()
            meta[key] = raw.strip("\"'") if raw else []
    return meta, text[end + 4 :].lstrip("\n")


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "note"


# --------------------------------------------------------------------- markdown


def inline(text: str) -> str:
    """Escape, then apply inline markdown; math spans are left for MathJax."""
    keep: list[str] = []

    def stash(value: str) -> str:
        keep.append(value)
        return f"\x00{len(keep) - 1}\x00"

    text = re.sub(r"\$\$.+?\$\$|\$[^$\n]+?\$", lambda m: stash(html.escape(m.group(0), False)), text)
    text = re.sub(r"`([^`]+)`", lambda m: stash(f"<code>{html.escape(m.group(1))}</code>"), text)
    text = re.sub(r"!\[\[[^\]]*\]\]", "", text)  # embeds of private files: drop
    text = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", text)  # [[target|alias]] -> alias
    text = re.sub(r"\[\[([^\]#|]+)(?:#[^\]]*)?\]\]", r"\1", text)  # [[target]] -> target
    text = html.escape(text, quote=False)

    def link(m: re.Match[str]) -> str:
        url = html.unescape(m.group(2)).strip()
        if not re.match(r"^https?://", url):
            return m.group(1)  # relative links point into the vault: keep the words only
        return stash(f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{m.group(1)}</a>')

    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)", r"<em>\1</em>", text)
    return re.sub(r"\x00(\d+)\x00", lambda m: keep[int(m.group(1))], text)


def render(body: str) -> tuple[str, str, str]:
    """Return (title, lead paragraph, sections html) for a note body."""
    body = re.sub(r"%%.*?%%", "", body, flags=re.S)  # Obsidian comments
    lines = body.splitlines()
    title, lead, out = "", "", []
    para: list[str] = []
    lists: list[tuple[str, int]] = []  # stack of (tag, indent)
    section_open = False
    i = 0

    def flush() -> None:
        nonlocal lead
        if para:
            text = " ".join(s.strip() for s in para)
            if not lead and not section_open and not out:
                lead = text
            else:
                out.append(f"<p>{inline(text)}</p>")
            para.clear()

    def close_lists(indent: int = -1) -> None:
        while lists and lists[-1][1] > indent:
            out.append(f"</li></{lists.pop()[0]}>")

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush(), close_lists()
            code = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            out.append(f"<pre><code>{html.escape(chr(10).join(code))}</code></pre>")
        elif stripped.startswith("$$"):
            flush()
            block = [stripped]
            if not (len(stripped) > 4 and stripped.endswith("$$")):
                while i + 1 < len(lines):
                    i += 1
                    block.append(lines[i].strip())
                    if lines[i].strip().endswith("$$"):
                        break
            math = html.escape(" ".join(block), quote=False)
            out.append(math if lists else f"<p>{math}</p>")
        elif m := re.match(r"^(#{1,4})\s+(.*)$", stripped):
            flush(), close_lists()
            level, text = len(m.group(1)), m.group(2)
            if level == 1 and not title:
                title = text
            elif level <= 2:
                if section_open:
                    out.append("</section>")
                out.append(f'<section class="content-section"><h2>{inline(text)}</h2>')
                section_open = True
            else:
                out.append(f"<h3>{inline(text)}</h3>")
        elif m := re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", line):
            flush()
            indent = len(m.group(1).replace("\t", "  "))
            tag = "ol" if m.group(2)[0].isdigit() else "ul"
            item = re.sub(r"^\[[ xX]\]\s+", "", m.group(3))
            if lists and lists[-1][1] == indent:
                out.append("</li>")
            elif not lists or indent > lists[-1][1]:
                out.append(f"<{tag}>")
                lists.append((tag, indent))
            else:
                close_lists(indent)
                out.append("</li>")
            out.append(f"<li>{inline(item)}")
        elif stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?[\s:|-]+\|", lines[i + 1]):
            flush(), close_lists()
            cells = lambda row: [c.strip() for c in row.strip().strip("|").split("|")]  # noqa: E731
            head = cells(line)
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i]))
                i += 1
            i -= 1
            thead = "".join(f"<th>{inline(c)}</th>" for c in head)
            tbody = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
            out.append(f'<div class="table-wrap"><table><thead><tr>{thead}</tr></thead><tbody>{tbody}</tbody></table></div>')
        elif stripped.startswith(">"):
            flush(), close_lists()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip())
                i += 1
            i -= 1
            if quote and (c := re.match(r"^\[!(\w+)\][+-]?\s*(.*)$", quote[0])):
                quote[0] = f"**{c.group(2) or c.group(1).title()}**"
            out.append(f"<blockquote><p>{inline(' '.join(quote))}</p></blockquote>")
        elif re.match(r"^(-{3,}|\*{3,})$", stripped):
            flush(), close_lists()
        elif not stripped:
            flush()
            if lists and not (i + 1 < len(lines) and re.match(r"^\s+\S|^\s*([-*+]|\d+[.)])\s", lines[i + 1])):
                close_lists()
        elif lists and line.startswith((" ", "\t")):
            out.append(" " + inline(stripped))
        else:
            close_lists()
            para.append(line)
        i += 1
    flush(), close_lists()
    if section_open:
        out.append("</section>")
    elif out:
        out = ['<section class="content-section">', *out, "</section>"]
    return title, lead, "\n".join(out)


PAGE = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} — Nhi's Library</title>
    <link rel="stylesheet" href="../css/styles.css?v=20261016-profile" />
    <style>
      .table-wrap {{ overflow-x: auto; }}
      table {{ border-collapse: collapse; margin: 12px 0; }}
      th, td {{ padding: 6px 10px; border: 1px solid #8884; text-align: left; vertical-align: top; }}
      blockquote {{ margin: 12px 0; padding: 4px 14px; border-left: 4px solid #8886; }}
    </style>
    <script>
      window.MathJax = {{
        tex: {{ inlineMath: [["$", "$"], ["\\\\(", "\\\\)"]], displayMath: [["$$", "$$"], ["\\\\[", "\\\\]"]] }},
        svg: {{ fontCache: "global" }}
      }};
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js"></script>
  </head>
  <body>
    <!-- Generated by tools/sync_universe.py from Nhi's Obsidian vault. Edit the note, not this file. -->
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="../../#library">Nhi's Library</a>
        <nav class="nav" aria-label="Library navigation"><a href="../../#library">← Back to Universe</a></nav>
      </div>
    </header>
    <main id="main">
      <h1 class="page-title">{title}</h1>
      {lead}
{sections}
    </main>
    <footer class="site-footer">
      <p><a href="../../#library">← Back to Nhi's Universe</a></p>
    </footer>
  </body>
</html>
"""


def plain(text: str, limit: int = 160) -> str:
    text = re.sub(r"\$[^$]*\$", "", text)
    text = re.sub(r"\[\[(?:[^\]|]+\|)?([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[*_`>#]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def collect(vault: Path, shelves: set[str]) -> tuple[list[dict], list[dict], dict[str, str], list[str]]:
    library, desk, pages, problems = [], [], {}, []
    for path in sorted(vault.rglob("*.md")):
        rel = path.relative_to(vault).as_posix()
        meta, body = frontmatter(path.read_text(encoding="utf-8"))
        mode = str(meta.get("publish", "")).lower()
        if mode in ("", "false", "no", "[]"):
            continue
        if any(rel == p or rel.startswith(p + "/") for p in PRIVATE):
            problems.append(f"refused (private folder): {rel}")
            continue
        title, lead, sections = render(body)
        title = title or path.stem
        if mode in ("true", "yes", "library"):
            shelf = str(meta.get("shelf", "")).strip()
            if shelf not in shelves:
                problems.append(f"skipped {rel}: shelf '{shelf}' is not one of {sorted(shelves)}")
                continue
            slug = slugify(path.stem)
            lead_html = f'<p class="page-sub">{inline(lead)}</p>' if lead else ""
            pages[slug] = PAGE.format(title=html.escape(title), lead=lead_html, sections=sections)
            library.append({"shelf": shelf, "title": title, "url": f"/universe/library/notes/{slug}.html",
                            "desc": plain(str(meta.get("desc") or lead or ""))})
        elif mode == "desk":
            item = {"title": title, "note": plain(str(meta.get("summary") or lead or ""))}
            link = str(meta.get("link", ""))
            if link.startswith("https://"):
                item["link"] = link
            desk.append(item)
        else:
            problems.append(f"skipped {rel}: unknown publish value '{mode}' (use library or desk)")
    return library, desk, pages, problems


# ---------------------------------------------------------------------- news


def newsstand(newstrace: Path) -> dict | None:
    cmd = [str(newstrace / "scripts" / "run.sh"), "newstrace", "digest", "--json",
           "--since", "72", "--per-topic", "15"]
    for topic in NEWS_TOPICS:
        cmd += ["--topic", topic]
    try:
        run = subprocess.run(cmd, cwd=newstrace, capture_output=True, text=True, timeout=600, check=True)
        digest = json.loads(run.stdout[run.stdout.index("{"):])
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        print(f"NewsTrace digest failed, keeping the previous newsstand: {exc}", file=sys.stderr)
        return None
    stories = []
    for topic, items in digest["topics"].items():
        for s in items:
            report = s["earliest_report"]
            if not report["url"].startswith("https://") or not AI_RE.search(s["title"]):
                continue
            if any(x["url"] == report["url"] for x in stories):
                continue
            stories.append({"title": s["title"], "url": report["url"], "domain": report["domain"],
                            "sources": s["independent_sources"], "topic": topic,
                            "date": (s["last_published_at"] or "")[:10]})
    stories.sort(key=lambda s: s["date"], reverse=True)
    stories.sort(key=lambda s: s["sources"], reverse=True)
    return {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "stories": stories[:8]}


# ---------------------------------------------------------------------- output


def previous_data() -> dict:
    try:
        text = DATA_FILE.read_text(encoding="utf-8")
        return json.loads(text.split(MARK)[1])
    except (OSError, IndexError, ValueError):
        return {}


def write_data(data: dict) -> None:
    payload = json.dumps(data, ensure_ascii=False, indent=1)
    DATA_FILE.write_text(f"""/* Generated by tools/sync_universe.py. Do not edit: change the vault note or NewsTrace. */
window.UNIVERSE_DATA = {MARK}{payload}{MARK};
(function (C, D) {{
  if (!C) return;
  (D.library || []).forEach(function (n) {{
    var shelf = (C.library || []).find(function (s) {{ return s.id === n.shelf; }});
    if (!shelf) return;
    shelf.notes = shelf.notes || [];
    if (!shelf.notes.some(function (x) {{ return x.url === n.url; }})) shelf.notes.push({{ title: n.title, url: n.url, desc: n.desc }});
  }});
  if (D.desk && D.desk.length) C.current = (C.current || []).concat(D.desk);
  if (D.newsstand) C.newsstand = D.newsstand;
}})(typeof CONTENT !== "undefined" ? CONTENT : null, window.UNIVERSE_DATA);  // content.js declares `const CONTENT`
""", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--vault", type=Path, default=VAULT)
    ap.add_argument("--newstrace", type=Path, default=NEWSTRACE)
    ap.add_argument("--no-news", action="store_true", help="keep the previous newsstand")
    ap.add_argument("--dry-run", action="store_true", help="list what would be published")
    args = ap.parse_args()

    content = (SITE / "js" / "content.js").read_text(encoding="utf-8")
    shelves = set(SHELVES_RE.findall(content.split("library:", 1)[1].split("],\n\n", 1)[0]))
    library, desk, pages, problems = collect(args.vault, shelves)
    for p in problems:
        print(f"! {p}", file=sys.stderr)
    print(f"Library notes: {len(library)}  " + ", ".join(f"{n['shelf']}/{n['title']}" for n in library))
    print(f"Desk items:    {len(desk)}  " + ", ".join(d["title"] for d in desk))
    if args.dry_run:
        return 0

    data = previous_data()
    news = None if args.no_news else newsstand(args.newstrace)
    data.update({"library": library, "desk": desk})
    if news is not None:
        data["newsstand"] = news
    print(f"Newsstand:     {len(data.get('newsstand', {}).get('stories', []))} stories"
          + ("" if news else " (unchanged)"))

    NOTES_DIR.mkdir(parents=True, exist_ok=True)
    for old in NOTES_DIR.glob("*.html"):
        if old.stem not in pages:
            old.unlink()  # unpublished in the vault -> removed from the site
    for slug, page in pages.items():
        (NOTES_DIR / f"{slug}.html").write_text(page, encoding="utf-8")
    write_data(data)
    print("Wrote", DATA_FILE.relative_to(SITE), "and", len(pages), "pages. Review with `git status`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
