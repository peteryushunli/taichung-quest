import type { BadgeDesign } from './badge-art';
import type { BadgeState } from './badge-bridge';
import './badge-view.css';

const node = (tag: string, className: string, text = '') => {
  const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
};

/** Presentation only. Nothing here receives focus or handles native inputs. */
export function createBadgeView(screen: HTMLElement, badges: BadgeDesign[]) {
  const root = node('div', 'badge-view'); root.hidden = true; root.setAttribute('role', 'img');
  const header = node('div', 'badge-view-header');
  const title = node('strong', 'badge-view-title'); const count = node('span', 'badge-view-count'); header.append(title, count);
  const grid = node('div', 'badge-view-grid');
  const slots = badges.map((badge, index) => {
    const slot = node('div', 'badge-view-slot'); slot.dataset.gym = String(index);
    const image = document.createElement('img'); image.alt = ''; image.src = badge.art; image.draggable = false;
    const number = node('span', 'badge-view-number', String(index + 1).padStart(2, '0'));
    const mark = node('span', 'badge-view-mark'); slot.append(image, number, mark); grid.append(slot); return { slot, mark };
  });
  const award = node('div', 'badge-view-award'); const awardArt = document.createElement('img'); awardArt.alt = ''; awardArt.draggable = false; award.append(awardArt);
  const detail = node('div', 'badge-view-detail'); const name = node('strong', 'badge-view-name');
  const place = node('span', 'badge-view-place'); const earned = node('span', 'badge-view-earned'); detail.append(name, place, earned);
  const footer = node('div', 'badge-view-footer'); root.append(header, grid, award, detail, footer); screen.append(root);
  let paired = false, loaded = false, state: BadgeState = {}, lastKey = '';
  const preload = badges.map(badge => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = badge.art; }));
  void Promise.all(preload).then(() => { loaded = badges.length === 10 && badges.every((badge, index) => badge.gymIndex === index && !!badge.art); render(); }, () => { loaded = false; render(); });

  function render() {
    const packet = state.snapshot;
    const badge = packet && badges[packet.selectedGym];
    if (!paired || !loaded || !packet || packet.flags !== 1 || ![1, 2].includes(packet.scene) || !badge) {
      root.hidden = true; root.removeAttribute('aria-label'); lastKey = ''; return;
    }
    const key = [packet.scene, packet.selectedGym, packet.completedMask, packet.language].join(':');
    if (key === lastKey) return;
    lastKey = key;
    const zh = packet.language === 2; const language = zh ? 'zh' : 'en'; const isAward = packet.scene === 2;
    const owned = !!(packet.completedMask & (1 << packet.selectedGym));
    root.lang = zh ? 'zh-Hant' : 'en'; root.dataset.scene = isAward ? 'award' : 'collection'; root.dataset.selectedGym = String(packet.selectedGym);
    root.dataset.completedMask = String(packet.completedMask);
    title.textContent = isAward ? zh ? '地標徽章' : 'LANDMARK BADGE' : zh ? '臺中城市護照' : 'CITY PASS';
    count.textContent = `${packet.completedMask.toString(2).replace(/0/g, '').length} / 10`;
    grid.hidden = isAward; award.hidden = !isAward;
    slots.forEach(({ slot, mark }, index) => {
      const complete = !!(packet.completedMask & (1 << index));
      slot.classList.toggle('is-earned', complete); slot.classList.toggle('is-selected', index === packet.selectedGym);
      slot.dataset.earned = String(complete); mark.textContent = complete ? '✓' : '·';
    });
    awardArt.src = badge.art; name.textContent = badge.name[language]; place.textContent = badge.landmark[language];
    earned.textContent = isAward ? zh ? '獲得徽章！' : 'Badge earned!' : owned ? zh ? '已獲得' : 'Earned' : zh ? '尚未獲得' : 'Not yet earned';
    earned.classList.toggle('is-earned', owned);
    footer.textContent = isAward ? zh ? 'A 繼續' : 'A Continue' : zh ? '方向鍵 選擇 · A 訓練家卡 · B 返回' : 'Arrows Choose · A Trainer Card · B Back';
    root.setAttribute('aria-label', `${title.textContent}. ${count.textContent}. ${badge.name[language]}. ${badge.landmark[language]}. ${earned.textContent}. ${footer.textContent}`);
    root.hidden = false;
  }
  return { element: root, setPaired(value: boolean) { paired = value; render(); }, update(value: BadgeState) { state = value; render(); } };
}
