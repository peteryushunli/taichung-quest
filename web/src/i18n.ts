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
  'A pocket-sized adventure through Taichung.\nArrive at the old station. Explore three city districts.': '把台中裝進口袋，展開一段小冒險。\n從舊車站抵達，探索三個城市街區。',
  'YOUR NEXT LITTLE ADVENTURE': '下一段小冒險，從這裡開始',
  'Next stop:\nTaichung.': '下一站，\n臺中。',
  'Start exploring': '開始探索',
  'Packing your bag…': '正在準備行囊…',
  'Begin at the old station. Make the city your own.': '從舊車站出發，慢慢認識臺中。',
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
  'Old Taichung Station': '舊臺中車站',
  'Start beside the old station. Three connected city districts are ready to explore.': '從舊車站旁出發，探索三個相連的城市街區。',
  'Follow your curiosity.': '跟著好奇心走。',
  'Meet the landmark hosts. Challenge Jun for your first City Pass stamp.': '拜訪地標會館，挑戰俊，取得第一枚城市護照印記。',
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
  'Begin at the old station. Get to know Taichung, one landmark at a time.': '從舊車站出發，一個地標、一段故事，慢慢認識臺中。',
  'Spot saved. Your next visit will pick up right here.': '進度已儲存，下次就從這裡繼續。',
  'Getting your adventure ready…': '正在準備你的冒險…',
  'Welcome back. Your last saved spot is waiting for you.': '歡迎回來，上次的冒險進度正在等你。',
  'New adventures begin at the old station. Use City Map to discover ten landmarks.': '新的冒險從舊車站展開，打開城市地圖，認識十個地標。',
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
  'Ten real places, one city adventure. Choose a landmark to discover its story and find official visitor information.': '十個真實地標，一場城市小冒險。點選地標，認識地方故事，並查閱官方參觀資訊。',
  'Xitun': '西屯區',
  'Greenway & culture': '草悟道文化區',
  'Old city': '舊城區',
  'Explorable city areas': '可探索的城市區域',
  'Selected landmark': '目前選取的地標',
  'Ten landmarks across three game districts. This compact game-world sketch is not a street-navigation map. The city areas and visitor halls use provisional game artwork.': '十個地標分布在三個遊戲街區。這是縮小的遊戲世界示意圖，不能用於街道導航；城市區域與參觀大廳目前使用初版遊戲美術。',
  'Real-world address': '真實地點地址',
  'PLANNED AREA · NOT PLAYABLE': '規劃中區域・尚未開放遊玩',
  'ARRIVAL AREA · EXPLORABLE': '抵達台中的第一站・可探索',
  'EXPLORABLE GAME AREA': '可探索的遊戲區域',
  'Explore this landmark’s district and visitor hall. Game artwork and interiors are provisional.': '可以探索地標所在街區與參觀大廳，遊戲美術與室內配置仍在逐步完善。',
  'This landmark is in the city plan; its game area is not playable in this build.': '這個地標已納入城市規劃，但目前版本尚未開放其遊戲區域。',
  'FICTIONAL GYM CHALLENGE': '遊戲中的虛構道館挑戰',
  'A prototype gym battle is playable here. Talk to the hall host. Its leader and team are provisional.': '可以與大廳接待員交談，體驗初版道館對戰；館主與隊伍仍為暫定內容。',
  'This gym challenge is being verified. The district and visitor hall are explorable.': '道館挑戰仍在驗證中，目前可以探索街區與參觀大廳。',
  'This landmark’s fictional gym challenge is not implemented yet. Leaders and teams remain undecided.': '這個地標的虛構道館挑戰尚未實作，館主與隊伍仍未決定。',
  'A small map. A bigger city.': '小小地圖，慢遊台中。',
  'Close City Map': '關閉城市地圖',
  'Schematic Taichung landmark map': '台中地標示意圖',
  'North points up': '上方為北方',
  'Choose a landmark': '選擇地標',
  'Selected landmark information': '目前選取的地標資訊',
  'Real places. A fictional adventure.': '真實的地方，虛構的冒險。',
  'Visitor information is available from the start.': '從一開始，就能認識每個地方。',
  'Back to adventure': '返回冒險',
  'ORIGINAL FIELD SKETCH': '原創地標速寫',
  'Official visitor information': '官方參觀資訊',
  'Source': '資料來源',
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
