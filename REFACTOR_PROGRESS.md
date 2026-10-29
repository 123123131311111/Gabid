# REFACTOR_PROGRESS

> Примечание: на момент начала этой сессии файл был пустым (0 байт), каталога `public/js/` не существовало — предыдущих изменений рефакторинга в архиве не найдено.

## Выполнено

### HERO_GUIDES → `public/js/data/hero-guides.js`
- Блок `HERO_GUIDES` (бывш. `game.js` строки 5175–5758, маркеры `HERO_GUIDES:BEGIN/END`, 27 героев) перенесён в `public/js/data/hero-guides.js` байт-в-байт (маркеры сохранены, `const HERO_GUIDES = {...}`).
- В `game.js` на месте блока оставлен однострочный комментарий-указатель. `GUIDE_ITEM_WHY` и остальной код не тронуты.
- `public/index.html`: добавлен `<script src="./js/data/hero-guides.js?v=0.9.8.1.1">` после `hero3d.js` и **перед** `game.js`.
- Потребители (без изменений): `game.js` (закуп ботов, `Hero` ~10230, меню/гайд ~21153, кнопка ~21545), `update974.js` (`HERO_GUIDES.psih = {...}` — выполняется после game.js, работает), `update9791.js` (читает через `typeof HERO_GUIDES`).

### Изменённые файлы
- `public/game.js` (удалён блок, +1 строка-комментарий)
- `public/index.html` (+1 `<script>`)
- `public/js/data/hero-guides.js` (новый)
- `REFACTOR_PROGRESS.md`

### Проверки
- `node --check` для game.js, hero-guides.js, update974.js — OK.
- diff: перенесённый блок идентичен оригиналу; остальной game.js идентичен оригиналу (кроме строки-комментария).
- В vm: файл исполняется отдельно, `HERO_GUIDES` = объект из 27 ключей, присваивание `HERO_GUIDES.x` (как в update974) работает.
- Дубликатов `const HERO_GUIDES` нет (game.js: 0, новый файл: 1).
- Статика раздаётся через `express.static('public')`, путь `/js/data/...` доступен.
- В браузере/игре НЕ запускалось.

## Требует внимания
- Маркер в файле говорит «сгенерировано gen_guides.py». Скрипта в архиве нет. Если генератор существует у автора, его нужно перенацелить на `public/js/data/hero-guides.js` — иначе повторный запуск вернёт блок в game.js. Способ не угадывался.
- `HERO_GUIDES.md` в корне — документация, не менялась.

## Осталось
- Следующие этапы рефакторинга (остальные системы) не начинались.
- Ручная проверка в браузере: меню → «ГАЙД БОЙЦА», закуп ботов, гайд героя `psih`.

---

## Этап 2: CHANGELOG и GAME_VERSION → `public/js/data/changelog.js` (выполнено)
- Перенесён непрерывный блок (бывш. `game.js` строки 707–1118): `const GAME_VERSION`, `const CHANGELOG_HISTORY` (83 записи), `const CHANGELOG` (IIFE, 97 выпусков). `CHANGELOG_HISTORY` перенесён как обязательная зависимость `CHANGELOG`; кроме `game.js` нигде не использовался. Содержимое байт-в-байт.
- В `game.js` оставлен комментарий-указатель. `let changelogPage` и `const CHANGELOG_PAGE_SIZE` остались в `game.js` (не входили в задачу; `CHANGELOG_PAGE_SIZE` нигде не используется).
- `index.html`: `<script src="./js/data/changelog.js?v=0.9.8.1.1">` после `hero-guides.js`, перед `game.js`. Обычные скрипты, без ES modules.
- Потребители (без изменений, все в `game.js`): `changelogRows`, экран changelog (~строки 800–1060 после сдвига), `GAME_VERSION` в меню/HUD/заставке. В `update*.js`, `demon3d.js`, `hero3d.js`, inline-скриптах `index.html` использований нет.
- Изменены: `public/game.js`, `public/index.html`, `public/js/data/changelog.js` (новый), `REFACTOR_PROGRESS.md`.
- Проверки: `node --check` game.js и changelog.js — OK; diff: блок идентичен оригиналу, остальной game.js идентичен; одно объявление каждой переменной (только в новом файле); в vm: GAME_VERSION='0.9.8.1.1', CHANGELOG.length=97. В браузере не запускалось.
- Примечание: версия обновляется теперь в `js/data/changelog.js`; query-строка `?v=` в index.html для кэша меняется вручную.

## Этап 3: процедурные текстуры карты → `public/js/render/map-textures.js` (выполнено частично — только независимая часть)
Перенесено (чистые построители, без `ctx`/`canvas` игры, без `WORLD`/камеры/`Math.random`; байт-в-байт):
- хелперы: `mulberry32`, `texWrap`, `shadeOf`, `drawStoneShape`;
- `GRASS_PALETTES`, `DIRT_PALETTES`, `ROAD_PALETTES`;
- `buildGrassTile`, `buildDirtTile`, `buildRoadTile`, `buildSandTile`, `buildWaterCausticTexture`;
- готовые canvas: `grassTileLight`, `grassTileDark`, `waterCausticCanvasA`, `waterCausticCanvasB`.
Сознательно ОСТАВЛЕНО в `game.js` (зависит от `ctx` или мира, не переносилось):
- все `ctx.createPattern(...)`: `grassTexturePattern`, `darkGrassTexturePattern`, `dirtPattern*`, `pathTexturePattern`, `darkPathTexturePattern`, `sandTexturePattern`, `waterPatternA/B` — `ctx` объявлен как `let` в `game.js`, порядок инициализации сохранён;
- `DECOR_STONE_SHADES`, `terrainDecor`, `buildTerrainDecor`, `drawTerrainDecor` — используют `WORLD`, `LANES`, `rangeXY` и камеру (связаны с миром/отрисовкой).
В `game.js` на местах вырезанных кусков — комментарии-указатели.
- `index.html`: `<script src="./js/render/map-textures.js?v=0.9.8.1.1">` после `changelog.js`, перед `game.js`. Обычные скрипты.
- Изменены: `public/game.js`, `public/index.html`, `public/js/render/map-textures.js` (новый), `REFACTOR_PROGRESS.md`.
- Проверки: `node --check` game.js и модуля — OK; остальной game.js идентичен оригиналу (кроме 3 указателей); дубликатов объявлений нет; модуль исполняется в vm с заглушкой DOM и создаёт все перечисленные символы. В браузере не запускалось (визуально карту не сверяли).

## Следующий этап
- Аудиосистема: движок, диктор и голоса (сначала найти границы и зависимости, не переносить вслепую).
- Возможное продолжение текстур: перенос `buildTerrainDecor/drawTerrainDecor` — только после анализа зависимостей от мира/камеры.
- Открыто с этапа 1: судьба `gen_guides.py` (генератор HERO_GUIDES отсутствует в архиве).
