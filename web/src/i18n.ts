export type Locale = 'en' | 'zh-Hant';
export type LocaleChange = { locale: Locale; source: 'user' | 'native' };

const STORAGE_KEY = 'taichung-quest-interface-language';
let locale: Locale = 'en';
try { if (localStorage.getItem(STORAGE_KEY) === 'zh-Hant') locale = 'zh-Hant'; } catch { /* Language selection still works without browser storage. */ }
const listeners = new Set<(change: LocaleChange) => void>();
const boundControls = new WeakSet<HTMLSelectElement>();

const zh: Record<string, string> = {
  'Interface language': '介面語言',
  'Language': '語言',
  'Player & City Map': '玩家介面與城市導覽',
  'Connecting to game…': '正在連接遊戲語言…',
  'Choose inside the game first': '請先在遊戲內選擇語言',
  'Taichung text + City Map': '台中內容與城市導覽',
  'Queued until gameplay resumes': '恢復探索後會套用語言',
  'Game: use its Language menu': '遊戲語言：請使用遊戲內選單',
  'Language covers custom Taichung content. Original FireRed screens remain English.': '語言切換涵蓋台中自訂內容，原版 FireRed 畫面仍為英文。',
  'A TAICHUNG ADVENTURE': '一段台中小冒險',
  'FIELD EDITION': '探索手記',
  'TAIWAN, WITH A LITTLE WONDER': '在台灣，發現生活的小驚喜',
  'Take the scenic route.': '沿著風景，慢慢走。',
  'A pocket-sized adventure through Taichung.\nSlow down. Meet the neighbors. See what turns up.': '把台中裝進口袋，展開一段小冒險。\n放慢腳步，認識街坊，看看會遇見什麼。',
  'YOUR NEXT LITTLE ADVENTURE': '下一段小冒險，從這裡開始',
  'Somewhere\nin Taichung.': '在台中的\n某個角落。',
  'Start exploring': '開始探索',
  'Packing your bag…': '正在準備行囊…',
  'A sunny afternoon. A whole new story.': '一個晴朗的午後，一段嶄新的故事。',
  'TAKE YOUR TIME': '慢慢來，沒關係',
  'A little breather.': '休息一下。',
  'Keep exploring': '繼續探索',
  'READY WHEN YOU ARE': '準備好了，就出發吧',
  'LOADING YOUR ADVENTURE': '正在載入冒險',
  'OUT EXPLORING': '探索中',
  'TAKING A BREATHER': '休息中',
  'WAITING FOR YOUR ADVENTURE': '等待冒險開始',
  'ADVENTURE INTERRUPTED': '冒險暫時中斷',
  'A LITTLE CURIOSITY GOES A LONG WAY': '帶著一點好奇心，就能走得更遠',
  'Get to know the city.': '認識這座城市。',
  'Real places behind the adventure.': '發現冒險裡的真實地景。',
  'City Map': '城市地圖',
  'Pause': '暫停',
  'Resume': '繼續',
  'Sound on': '音效開啟',
  'Sound off': '音效關閉',
  'Save spot': '儲存進度',
  'A FEW FIELD NOTES': '幾則探索筆記',
  'FIRST STOP': '第一站',
  'West District': '台中西區',
  'Leafy paths, neighborhood corners, and a tea break along the way.': '綠蔭步道、街坊轉角，還有路上的一杯茶。',
  'Follow your curiosity.': '跟著好奇心走。',
  'Explore the Greenway, meet the locals, and find your first little errand.': '漫步草悟道，認識在地居民，發現第一件小委託。',
  'Say hello.': '打聲招呼。',
  'Walk up to someone and press': '走近居民，按下',
  'or': '或',
  'to see what they have to say.': '，聽聽他們想說什麼。',
  'Make yourself at home.': '輕鬆玩，慢慢探索。',
  'Wander around': '四處走走',
  'Interact / back': '互動／返回',
  'Open the menu': '開啟選單',
  'Touch controls work too. A little old-school, wherever you are.': '也可以使用螢幕上的按鈕，隨時體驗復古小冒險。',
  'Your saved adventures': '你的冒險存檔',
  'Your spot is saved here every 20 seconds. Keep an extra backup using a game save from the in-game menu.': '每 20 秒會自動儲存進度。也可以先在遊戲選單中存檔，再下載一份備份。',
  'Download save': '下載存檔',
  'Import save': '匯入存檔',
  'MADE FOR A SUNNY AFTERNOON.': '為一個晴朗的午後而作。',
  'AN EXPERIMENT IN LOCAL ADVENTURE': '一場在地冒險實驗',
  'POWERED BY': '模擬器核心',
  'RUNTIME LICENSE': '核心授權資訊',
  'FONT LICENSE': '字型授權資訊',
  'Taichung Quest home': 'Taichung Quest 首頁',
  'Playable game': '可遊玩的遊戲',
  'Game controls': '遊戲控制',
  'Movement controls': '移動控制',
  'Move up': '向上移動',
  'Move down': '向下移動',
  'Move left': '向左移動',
  'Move right': '向右移動',
  'B button, back': 'B 鍵：返回',
  'A button, interact': 'A 鍵：互動',
  'Emulator controls': '模擬器控制',
  'Enter fullscreen': '進入全螢幕',
  'Restart game': '重新啟動遊戲',
  'Adventure guide': '冒險指南',
  'Taichung Quest game screen. Arrow keys to move, Z to interact, X to go back, Enter for menu.': 'Taichung Quest 遊戲畫面。方向鍵移動，Z 鍵互動，X 鍵返回，Enter 開啟選單。',
  'Your last saved spot is waiting in this browser.': '上次的冒險進度，正在這個瀏覽器裡等你。',
  'No downloads. Just a little time to wander.': '不用下載，留一點時間隨意走走就好。',
  'Spot saved. Your next visit will pick up right here.': '進度已儲存，下次就從這裡繼續。',
  'Getting your adventure ready…': '正在準備你的冒險…',
  'Welcome back. Your last saved spot is waiting for you.': '歡迎回來，上次的冒險進度正在等你。',
  'You’re here. Use the arrows to wander and Z to say hello.': '抵達了！用方向鍵走走，按 Z 鍵打聲招呼。',
  'The game stopped unexpectedly. Restart it to return to your saved progress.': '遊戲意外停止了，請重新啟動，返回已儲存的進度。',
  'Browser storage is unavailable. Download your save for a backup.': '瀏覽器儲存空間無法使用，請下載存檔備份。',
  'Your spot could not be saved in this browser. Use the in-game Save menu and Download save for a backup.': '無法在這個瀏覽器儲存進度。請使用遊戲內的存檔功能，再下載存檔備份。',
  'The game could not capture your spot yet.': '暫時無法儲存目前的進度。',
  'This emulator needs an isolated browser tab. Open the game directly in a current browser; the server must send COOP and COEP headers.': '這個模擬器需要獨立的瀏覽器分頁。請使用新版瀏覽器直接開啟；網站伺服器也必須啟用 COOP 與 COEP。',
  'The game cartridge is still being built. Try again once the Taichung build is ready.': '台中遊戲版本仍在建置中，完成後請再試一次。',
  'The game cartridge is not ready yet. Build the Taichung ROM, then try again.': '遊戲版本尚未就緒，請先完成台中 ROM 的建置，再試一次。',
  'The emulator could not open this game cartridge.': '模擬器無法開啟這個遊戲版本。',
  'The emulator runtime did not finish loading. Refresh the page and try again.': '模擬器未能完成載入，請重新整理頁面後再試一次。',
  'The emulator runtime could not be loaded. Refresh the page and try again.': '無法載入模擬器，請重新整理頁面後再試一次。',
  'Something went wrong while loading the game.': '載入遊戲時發生問題。',
  'Fullscreen isn’t available in this browser. You can still explore right here.': '這個瀏覽器不支援全螢幕，仍然可以在這裡繼續探索。',
  'Restart the cartridge? Your in-game save is kept, but progress since that save will restart.': '要重新啟動遊戲嗎？遊戲內的存檔會保留，尚未存檔的進度將會重新開始。',
  'A fresh start. Your in-game save is still available from the title screen.': '重新出發！仍可從標題畫面繼續遊戲內的存檔。',
  'RESTARTING CARTRIDGE': '正在重新啟動遊戲',
  'Restart cartridge': '重新啟動遊戲',
  'Restart': '重新啟動',
  'Cancel': '取消',
  'Import game save': '匯入遊戲存檔',
  'Your in-game save is kept. Progress since that save will be lost.': '遊戲內的存檔會保留，尚未存檔的進度將會捨棄。',
  'Keeping your in-game save and restarting the cartridge…': '正在保留遊戲存檔並重新啟動…',
  'Importing your save and restarting the cartridge…': '正在匯入存檔並重新啟動遊戲…',
  'Save imported. Start exploring, then choose Continue from the game’s title screen.': '存檔已匯入，按下開始探索，再從遊戲標題畫面選擇「繼續」。',
  'Cartridge restarted. Start exploring to continue your in-game save or begin a new adventure.': '遊戲已重新啟動，按下開始探索，即可繼續存檔或展開新冒險。',
  'Cartridge restarted. Continue your in-game save or begin a new adventure.': '遊戲已重新啟動，可以繼續存檔或展開新冒險。',
  'Your save could not be stored safely. Download a save backup before trying Restart again.': '無法安全儲存遊戲存檔，請先下載備份，再嘗試重新啟動。',
  'Save from the game’s own menu first, then download your backup here.': '請先在遊戲選單中存檔，再從這裡下載備份。',
  'Game save downloaded. Keep it somewhere safe for your next adventure.': '存檔已下載，請妥善保存，留給下一次冒險。',
  'Choose a compatible FireRed .sav file (64 KB or 128 KB, including mGBA backups).': '請選擇相容的 FireRed .sav 存檔（64 KB 或 128 KB，亦接受 mGBA 備份檔）。',
  'Import this save and restart the cartridge? It will replace the current in-game save in this browser.': '要匯入這份存檔並重新啟動遊戲嗎？它將取代這個瀏覽器裡目前的遊戲存檔。',
  'Save imported. Choose Continue from the game’s title screen.': '存檔已匯入，請從遊戲標題畫面選擇「繼續」。',
  'The save could not be imported. Restart the page to reload your last saved spot.': '無法匯入存檔，請重新整理頁面，載入上次儲存的進度。',
  'TAICHUNG FIELD GUIDE': '台中城市導覽',
  'A small map. A bigger city.': '小小地圖，慢遊台中。',
  'Close City Map': '關閉城市地圖',
  'A few places that make Taichung, Taichung. Choose any landmark to discover the real city behind the adventure.': '幾個讓台中成為台中的好地方。點選地標，認識冒險背後的真實城市。',
  'Schematic Taichung landmark map': '台中地標示意圖',
  'North points up': '上方為北方',
  'Playable starting area': '可探索的起始區域',
  'Guide example · not playable': '導覽範例・尚未開放遊玩',
  'A compressed game-world sketch, not a street-navigation map. These five landmarks are guide examples. The full city layout and gym roster are still undecided.': '這是縮小後的遊戲世界示意圖，不能用於街道導航。五個地標均為導覽範例；完整城市配置與道館名單尚未決定。',
  'Choose a landmark': '選擇地標',
  'Selected landmark information': '目前選取的地標資訊',
  'Real places. A fictional adventure.': '真實的地方，虛構的冒險。',
  'Visitor information is available from the start.': '從一開始，就能認識每個地方。',
  'Back to adventure': '返回冒險',
  'ORIGINAL FIELD SKETCH': '原創地標速寫',
  'Green space': '城市綠地',
  'Shopping & culture': '購物與文化',
  'Art museum': '美術館',
  'Science museum': '科學博物館',
  'Performing arts': '表演藝術',
  'Official visitor information': '官方參觀資訊',
  'Source': '資料來源',
  'PLAYABLE STARTING AREA': '可探索的起始區域',
  'GUIDE PREVIEW · NOT PLAYABLE': '導覽預覽・尚未開放遊玩',
  'Explore a provisional Greenway-inspired neighborhood in the current game.': '目前遊戲可探索以草悟道為靈感的初版街區。',
  'This real place is a visitor-guide example. Inclusion in the game world and gym roster is undecided.': '這個真實地點目前是城市導覽範例；是否納入遊戲世界與道館名單，尚未決定。',
  'FICTIONAL GYM': '虛構道館',
  'No gym is assigned to this guide entry in the current build. The final gym roster is undecided.': '目前版本未為這則導覽指定道館，最終道館名單尚未決定。',
  "A green urban corridor linking Taichung's science and art museums, Civic Square and neighborhood shops. Come for a relaxed walk through the city's mix of culture and open space.": '串連科學博物館、美術館、市民廣場與街邊商店的城市綠廊。適合放慢腳步散步，在綠意與文化景點之間感受台中的日常。',
  'A shopping and dining landmark beside Calligraphy Greenway, known for its planted walls and green architecture. Browse books and design shops, then step back into the surrounding public spaces.': '位在草悟道旁的購物與餐飲地標，以植生牆和綠建築特色聞名。逛逛書店與設計商店，再走回周邊的開放空間。',
  "A national art museum focused on modern and contemporary Taiwanese art. Explore its exhibitions and outdoor sculpture park for a closer look at Taiwan's artists and visual culture.": '以臺灣現代與當代藝術為重點的國立美術館。可以參觀展覽、漫步戶外雕塑園區，認識臺灣藝術家與視覺文化。',
  "A science museum with galleries about life, human cultures and the environment, plus a botanical garden. Discover dinosaur exhibits and Taiwan's native plants at a major destination for learning about the natural world.": '結合生命、人類文化、環境等主題展區與植物園的科學博物館。從恐龍展示到臺灣原生植物，是認識自然世界的重要去處。',
  'A performing arts venue designed by architect Toyo Ito, known for flowing curved walls and connected sound-cave spaces. Visit for its architecture, public spaces and performances.': '由建築師伊東豊雄設計的表演藝術場館，以流動曲牆與相互串連的「美聲涵洞」空間聞名。可以欣賞建築、逛逛公共空間，或安排一場演出。',
};

export function getLocale() { return locale; }
export function t(english: string) { return locale === 'zh-Hant' ? (zh[english] ?? english) : english; }

export function localizeTree(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nLabel!)); });
  root.querySelectorAll<HTMLSelectElement>('[data-locale-select]').forEach((control) => { control.value = locale; });
}

export function setLocale(next: Locale, source: LocaleChange['source'] = 'user') {
  locale = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* UI remains usable if persistence is unavailable. */ }
  document.documentElement.lang = locale;
  localizeTree();
  for (const listener of listeners) listener({ locale: next, source });
}

export function onLocaleChange(listener: (change: LocaleChange) => void) { listeners.add(listener); return () => listeners.delete(listener); }

export function languageControl(id: string) {
  return `<label class="language-control" for="${id}"><span data-i18n="Language">${t('Language')}</span><select id="${id}" data-locale-select aria-label="Language · 語言"><option value="en"${locale === 'en' ? ' selected' : ''}>English</option><option value="zh-Hant"${locale === 'zh-Hant' ? ' selected' : ''}>繁體中文</option></select><small data-language-hint data-i18n="Player & City Map" aria-live="polite">${t('Player & City Map')}</small></label>`;
}

export function initializeLocalization(root: ParentNode = document) {
  document.documentElement.lang = locale;
  root.querySelectorAll<HTMLSelectElement>('[data-locale-select]').forEach((control) => {
    if (boundControls.has(control)) return;
    boundControls.add(control);
    control.addEventListener('change', () => setLocale(control.value === 'zh-Hant' ? 'zh-Hant' : 'en'));
  });
  localizeTree(root);
}
