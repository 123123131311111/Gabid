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

## Этап 4: настройки графики → `public/js/data/graphics-settings.js` (выполнено частично — только независимые данные)
Аудиосистема по решению пользователя пропущена (звуки уже в `sounds/`, не трогались).
Перенесено (байт-в-байт): `GFX_PRESETS`, `GFX` (объект текущих значений), `GFX_PARTICLE_MUL`, `PERF_NAMES`, `gfxSave()` (запись `dota-sens-gfx` в localStorage).
Оставлено в `game.js` намеренно (зависит от состояния/рендера, не переносилось):
- `perfLevel` и чтение `dota-sens-perf`; загрузка сохранённого `GFX` из `dota-sens-gfx` (читает `perfLevel`);
- `gfxPresetValues` (использует `clamp` из game.js), `gfxGlowK`, `fxl`, `perfLite`, `perfRenderScale`, `setPerfLevel` (трогает `particles`, `grassBends`, `terrainFrameValid`, `resize`, `gameState`), `terrainRefreshEvery`, `particleCap`, `fxCap`, `perfSample`, патч `shadowBlur`, обработчик F8, `towerFxCap` и др. лимиты, UI-панель настроек (`GFX_ROWS`, `gfx*Panel`) — завязаны на игровое состояние и отрисовку.
- На месте вырезанных кусков — комментарий-указатель. Порядок инициализации сохранён: модуль грузится раньше game.js, блок чтения localStorage видит `GFX`/`GFX_PRESETS`.
- `index.html`: `<script src="./js/data/graphics-settings.js?v=0.9.8.1.1">` перед `map-textures.js` и `game.js`. Обычные скрипты.
- Изменены: `public/game.js`, `public/index.html`, `public/js/data/graphics-settings.js` (новый), `REFACTOR_PROGRESS.md`.
- Проверки: `node --check` — OK; в vm модуль создаёт GFX/пресеты/PERF_NAMES(4)/GFX_PARTICLE_MUL, `gfxSave()` пишет JSON; дубликатов объявлений нет (в game.js 0, в модуле по одному). Использований в других файлах (`update*.js`, `hero3d.js`, `demon3d.js`) нет. В браузере не запускалось.

## Этап 5: интерфейс аккаунта, профиля, аватаров и рейтинга → `public/js/ui/` (выполнено частично — только независимая часть отображения)
Перенесено байт-в-байт (404 строки, бывш. `game.js` ~20293–21008; на местах вырезанных кусков — комментарии-указатели `/* [перенесено → ...] */`):
- `js/ui/account-display.js`: `ACCOUNT_RANKS`, `accountRank`, `MMR_RANKS`, `accountRatingRank`, `refreshOnlineEntryLabel`, `careerHeroName`, `careerNode`.
- `js/ui/career-panel.js`: `renderCareerPanel` (статистика, любимые герои, история матчей, подробный отчёт).
- `js/ui/leaderboard-ui.js`: `renderLeaderboardPanel`, `showLeaderboardProfile`, обработчик кнопки «назад» (`leaderboard-profile-back`), `window.openLeaderboard`, `window.closeLeaderboard`.
- `js/ui/avatars.js`: `AVATAR_DEFS`, `avatarImages`, `renderAvatarPicker`.
- `js/ui/account-modal.js`: `accountUi` (ссылки на DOM), `setAccountMessage`, `renderAccountModal`, `openAccountModal`, `closeAccountModal`.
Сознательно ОСТАВЛЕНО в `game.js`:
- авторизация/сеть/сохранения: `accountApi`, `accountSet`, `accountStore/Read`, `submitAccountForm`, `submitRename`, `submitLogout`, `bindAccountUi` (обработчики + восстановление сессии), `accountSetAvatar`, `loadAccountCareer`, `loadLeaderboard`, результаты матчей (`accountRecordResult`, `accountSendResult`, `accountFlushPending`, `pendingResults`, `currentMatchCareerStats`), локальные детали матчей (`readAccountMatchDetails`, `saveAccountMatchDetails`, `mergeLocalMatchDetails`);
- состояние: `account`, `accountCareer`, `leaderboardLoading/Error`, `selectedLeaderboardProfile`, `accountMode`, `accountBusy`, `setAccountMode` (меняет режим формы входа/регистрации — часть авторизации);
- рисование на основном canvas: `drawThemeAvatar`, `buildAvatarCache`, `drawAvatarImage`, `avatarCacheBuilt` (завязаны на `ctx`, `drawHeroTexture`, кадр); карточка профиля/кнопки в меню на canvas (`menuProfileRect`, `menuHomeHits`, места использования `drawAvatarImage`).
Подключение: `index.html` — пять `<script src="./js/ui/*.js?v=0.9.8.1.1">` после `map-textures.js`, перед `game.js` (порядок: account-display, avatars, career-panel, leaderboard-ui, account-modal). Обычные скрипты, не ES modules.
Важно: модули на верхнем уровне обращаются только к DOM (`getElementById` для `accountUi` и кнопки «назад»); всё остальное из `game.js` (`account`, `accountCareer`, `onlineEntryElement`, `HERO_DEFS`, `SHOP_ITEMS`, `canvas`, `playSynthSfx`, `accountSetAvatar`, `loadLeaderboard`, `avatarCacheBuilt` и т.д.) используется только внутри функций, при вызове. `update979.js` вызывает `renderAccountModal()` — глобальное имя сохранено; `index.html` (inline) использует `openAccountModal`, `window.openLeaderboard/closeLeaderboard` — сохранены.
Изменены: `public/game.js` (−404 строки, +15 указателей), `public/index.html` (+5 `<script>`), `public/js/ui/account-display.js`, `career-panel.js`, `leaderboard-ui.js`, `avatars.js`, `account-modal.js` (новые), `REFACTOR_PROGRESS.md`. `accounts.js`, `server.js`, `update*.js`, `hero3d.js`, `demon3d.js` не менялись.
Проверки: `node --check` game.js и всех 5 модулей — OK; diff: удалённые из game.js строки (404) совпадают с содержимым модулей без пропусков и добавлений, остальной game.js идентичен оригиналу (кроме указателей); дубликатов объявлений нет (в game.js 0, в модулях по 1); в vm с заглушками DOM и состояния модули загружаются в нужном порядке, `renderAccountModal`, `renderLeaderboardPanel`, `showLeaderboardProfile`, `openAccountModal/closeAccountModal`, `openLeaderboard/closeLeaderboard`, `renderCareerPanel` (с матчем и участниками), `renderAvatarPicker` (23 аватара) отрабатывают без ошибок. В браузере НЕ запускалось — нужна ручная проверка: окно аккаунта (вход/регистрация, смена ника/аватара, выход), карьера и отчёт матча, мировой рейтинг и карточка игрока, подпись кнопки «ОНЛАЙН».

## Этап 6 (последний): UI-контент → `public/js/data/ui-content.js` (выполнено)
- Перенесено байт-в-байт (64 строки): `const GUIDE_ITEM_WHY` (35 предметов) и `const UPDATE_SPOTLIGHT` (25 записей). Оба — независимые литералы без ссылок на другой код; используются только внутри функций `game.js` (`drawMenuUpdatePreview`, отрисовка подсказки гайда закупа), в других файлах не встречаются.
- В `game.js` на местах блоков — комментарии-указатели. Имена и тексты не менялись.
- `index.html`: `<script src="./js/data/ui-content.js?v=0.9.8.1.1">` перед `graphics-settings.js` и `game.js`. Обычный скрипт.
- Проверки: `node --check` game.js и модуля — OK; удалённые из game.js строки (64) — только перенесённые блоки; объявлений в game.js 0, в модуле по одному; в vm модуль исполняется отдельно (35 и 25 элементов). В браузере не запускалось.
- Изменены: `public/game.js`, `public/index.html`, `public/js/data/ui-content.js` (новый), `REFACTOR_PROGRESS.md`.

## ИТОГ: рефакторинг завершён
Этап 6 — последний запланированный. Новые переносы не планируются; архитектурные изменения — только когда они нужны для конкретной функции или исправления ошибки.

### Фактически завершённые переносы
- `js/data/hero-guides.js` — `HERO_GUIDES`
- `js/data/changelog.js` — `GAME_VERSION`, `CHANGELOG_HISTORY`, `CHANGELOG`
- `js/data/graphics-settings.js` — `GFX_PRESETS`, `GFX`, `GFX_PARTICLE_MUL`, `PERF_NAMES`, `gfxSave`
- `js/data/ui-content.js` — `GUIDE_ITEM_WHY`, `UPDATE_SPOTLIGHT`
- `js/render/map-textures.js` — построители процедурных текстур (без `createPattern`)
- `js/ui/` — `account-display.js`, `avatars.js`, `career-panel.js`, `leaderboard-ui.js`, `account-modal.js`

### Намеренно оставлено в game.js
- Игровая логика, герои, боты, бой, мир/карта, камера, главный цикл, сеть/онлайн.
- Магазин и инвентарь (данные и UI), включая `SHOP_ITEMS`, `HERO_DEFS`.
- Аудиосистема (по решению пользователя).
- Всё, что зависит от `ctx`/состояния: `ctx.createPattern(...)`, `buildTerrainDecor/drawTerrainDecor`, логика графики (`perfLevel`, `setPerfLevel`, лимиты, панель настроек).
- Авторизация/сеть аккаунта, результаты матчей, рисование аватаров и карточки профиля на canvas.
- Рисование меню на canvas.

### Известные проблемы и ограничения
- Ни один этап не проверялся в браузере — только `node --check`, vm-загрузка и diff. Нужна ручная проверка: меню (новости обновлений), гайд закупа (строка «почему»), ГАЙД БОЙЦА, окно аккаунта, рейтинг, карьера, графика, карта.
- `gen_guides.py` (генератор `HERO_GUIDES`) отсутствует в архиве; если он есть у автора, его нужно перенацелить на `js/data/hero-guides.js`.
- Версия игры теперь в `js/data/changelog.js`; `?v=` в `index.html` обновляется вручную.
- `let changelogPage` и `CHANGELOG_PAGE_SIZE` (не используется) остались в `game.js`.
- Модули — обычные скрипты в глобальной области; конфликты имён контролируются вручную (порядок подключения в `index.html` важен).

## 0.9.9.0 (feature update)
- 6 новых лесных лагерей (NEUTRAL_CAMPS 6–11), 3 лесных крипа: slime, shaman, alpha (game.js, NeutralCreep)
- 2 новых задания за Сенсики: double_win, team_player (accounts.js: claimquest, update979.js)
- Демон меню: надстройка royalUpgrade в demon3d.js
