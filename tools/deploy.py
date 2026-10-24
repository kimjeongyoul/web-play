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


# The engine's WebGL name tables grew for ever on the web (방치형 2026-10-24, heap snapshots: JS heap
# +1 MB a minute per table): emscripten gives every new GL object (Godot makes and deletes buffers, VAOs
# and fences every frame) the next number of one shared counter and leaves deleted slots null, so every
# table is padded out to that counter. Each table now hands its freed numbers out again; GL.counter stays
# above every number given (glGetUniformLocation checks a program against it). From idle-practice's
# export_web.py, applied here so every game gets it. A build already patched is left as it is.
OLD_ID = "getNewId:table=>{var ret=GL.counter++;for(var i=table.length;i<ret;i++){table[i]=null}return ret}"
NEW_ID = ("getNewId:table=>{var f=table.freeIds,id;if(f&&f.length){id=f.pop()}else{if(!table.length)table.push(null);"
          "table.push(null);id=table.length-1}if(id>=GL.counter)GL.counter=id+1;return id}")
GL_TABLES = ["buffers", "framebuffers", "programs", "queries", "renderbuffers", "shaders", "syncs", "textures", "vaos"]


def patch_gl_ids(js: Path) -> str:
    code = js.read_text(encoding="utf-8")
    if NEW_ID in code:
        return "already"
    if code.count(OLD_ID) != 1:
        sys.exit(f"{js.name}: getNewId not found once (engine changed?): GL table patch not applied, nothing deployed")
    code = code.replace(OLD_ID, NEW_ID)
    for table in GL_TABLES:
        old = f"GL.{table}[id]=null"
        if code.count(old) != 1:
            sys.exit(f"{js.name}: {old} not found once: GL table patch not applied, nothing deployed")
        code = code.replace(old, f"(GL.{table}[id]=null,(GL.{table}.freeIds||(GL.{table}.freeIds=[])).push(id))")
    js.write_text(code, encoding="utf-8")
    return "patched"


def main() -> None:
    game, build, version = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    dest = Path(__file__).resolve().parent.parent / game
    if not re.fullmatch(r"[A-Za-z0-9_-]+", version) or not (build / "index.html").exists():
        sys.exit("usage: deploy.py <game> <build folder with index.html> <version>")
    name = f"v_{version}"
    # Check the GL patch fits before anything in the game folder changes
    engine_js = (build / "index.js").read_text(encoding="utf-8")
    if NEW_ID not in engine_js and engine_js.count(OLD_ID) != 1:
        sys.exit("index.js: getNewId not found once (engine changed?): nothing deployed")
    # Engine files of earlier versions (or the old fixed index.* names) go away
    for old in dest.glob("*"):
        if old.is_file() and (old.name.startswith("v_") or old.name in [f"index{e}" for e in ENGINE]):
            old.unlink()
    for ext in ENGINE:
        src = build / f"index{ext}"
        if src.exists():
            shutil.copy2(src, dest / f"{name}{ext}")
    gl = patch_gl_ids(dest / f"{name}.js")
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
    print(f"{game}: {name} ({', '.join(e for e in ENGINE if (dest / (name + e)).exists())}), GL tables {gl}")


if __name__ == "__main__":
    main()
