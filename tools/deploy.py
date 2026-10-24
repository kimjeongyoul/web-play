# Copies an exported Godot web build into web-play/<game>/ with the engine files renamed per version
# (v_<version>.js / .wasm / .pck / .audio*.worklet.js), so a phone never runs an old cached build:
# 2026-10-24 an iPhone kept showing a defense build from before a fix (settings all □) after newer
# ones were up. index.html keeps its name (GitHub Pages caches it 10 minutes) and points at the new files.
#   python -I tools/deploy.py <game folder, e.g. defense> <build folder> <version, e.g. the commit>
import re
import shutil
import sys
from pathlib import Path

ENGINE = [".js", ".wasm", ".pck", ".audio.worklet.js", ".audio.position.worklet.js"]
# Godot's PWA service worker serves index.html, the pck and the wasm from its cache first, so a phone
# that once opened a PWA build keeps the old game until every tab of it is closed (디펜스 · 로그라이크
# 2026-10-24). Every game folder always gets this worker instead: when the browser checks for a newer
# worker it installs at once, empties the old caches, unregisters itself and reloads the page.
# Never delete this file from web-play: an old worker only lets go when it finds this one.
KILL_SWITCH = """// Replaces an old cached Godot PWA worker: clears its caches, unregisters, reloads the page (web-play/tools/deploy.py).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) await caches.delete(key);
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
})()));
"""


def main() -> None:
    game, build, version = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    dest = Path(__file__).resolve().parent.parent / game
    if not re.fullmatch(r"[A-Za-z0-9_-]+", version) or not (build / "index.html").exists():
        sys.exit("usage: deploy.py <game> <build folder with index.html> <version>")
    name = f"v_{version}"
    # Engine files of earlier versions (or the old fixed index.* names) go away
    for old in dest.glob("*"):
        if old.is_file() and (old.name.startswith("v_") or old.name in [f"index{e}" for e in ENGINE]):
            old.unlink()
    for ext in ENGINE:
        src = build / f"index{ext}"
        if src.exists():
            shutil.copy2(src, dest / f"{name}{ext}")
    # Other files (icons, splash, a manifest) keep their names; Godot's own PWA files are not copied
    pwa = {"index.service.worker.js", "index.manifest.json", "index.offline.html"}
    for src in build.iterdir():
        if src.is_file() and src.name != "index.html" and src.name not in pwa \
                and not any(src.name == f"index{e}" for e in ENGINE) and not src.name.endswith(".import"):
            shutil.copy2(src, dest / src.name)
    html = (build / "index.html").read_text(encoding="utf-8")
    html = html.replace('src="index.js"', f'src="{name}.js"')
    html = html.replace('"executable":"index"', f'"executable":"{name}"')
    html = html.replace('"index.pck":', f'"{name}.pck":').replace('"index.wasm":', f'"{name}.wasm":')
    if f'"executable":"{name}"' not in html or f'src="{name}.js"' not in html:
        sys.exit("index.html did not have the expected engine references; nothing renamed there")
    # The page must not register a worker again (PWA off), and the old one gets the kill switch
    html = re.sub(r'"serviceWorker":"[^"]*"', '"serviceWorker":""', html)
    (dest / "index.html").write_text(html, encoding="utf-8")
    (dest / "index.service.worker.js").write_text(KILL_SWITCH, encoding="utf-8")
    print(f"{game}: {name} ({', '.join(e for e in ENGINE if (dest / (name + e)).exists())})")


if __name__ == "__main__":
    main()
