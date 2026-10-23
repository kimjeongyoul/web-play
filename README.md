# web-play

친구들이 핸드폰 · 컴퓨터 브라우저에서 게임을 해 보는 주소(GitHub Pages). **내보낸 결과물만** 올린다. 게임 소스는 각 게임의 비공개 저장소에 있다. 총괄 담당.

- 주소: https://kimjeongyoul.github.io/web-play/ (첫 화면 = 게임 목록, `index.html`)
- 게임마다 폴더 하나: `survivor/`, `defense/` 안에 Godot 웹 내보내기 결과(`index.html`, `.wasm`, `.pck`, `.js`)
- 검색에 안 잡히게 `robots.txt`와 `noindex`. 그래도 주소를 아는 사람은 누구나 들어온다.

## 올리는 법
1. 게임 담당이 웹 프리셋으로 내보낸다: 스레드 끄기(`variant/thread_support=false`, 그래야 Pages에서 돈다), `html/canvas_resize_policy` Adaptive, 내보내기 필터로 `tests/`, `tools/`, `*.md`, 원본 그림(`source/`)은 뺀다.
2. 내보낸 폴더를 여기 `<게임>/`에 통째로 바꿔 넣고, `index.html`의 그 게임 줄을 링크로 바꾼다.
3. 커밋 · 푸시(총괄). 1~2분 뒤 주소에 반영된다.

## 새는 것에 대해
웹 게임은 어디에 올려도 받아서 풀어 볼 수 있다(.pck 안 그림 · 스크립트). 막는 게 아니라 줄인다: 결과물만 올린다, 쓰지 않는 그림 · 테스트 · 문서를 내보내기에서 뺀다, 열쇠 · 비밀번호는 게임에 넣지 않는다(플레이 기록 시트 주소는 넣지만, 적기만 되고 읽기는 안 되는 주소다).
