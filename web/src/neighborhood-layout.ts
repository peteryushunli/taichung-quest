import { placeNeighborhoodLabels } from './neighborhood-labels';

/** Responsive DOM labels shared by the landing map and paused City Map. */
export function observeNeighborhoodLayout(map: HTMLElement, labelSelector: string, obstacleSelector: string) {
  const layout = () => {
    const bounds = map.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const labels = [...map.querySelectorAll<HTMLElement>(labelSelector)].filter(label => label.dataset.anchorX !== undefined);
    const obstacles = [...map.querySelectorAll<HTMLElement>(obstacleSelector)].map(element => element.getBoundingClientRect())
      .filter(box => box.width && box.height).map(box => ({ x: box.left - bounds.left, y: box.top - bounds.top, width: box.width, height: box.height }));
    const boxes = labels.map(label => {
      label.hidden = false;
      return { x: Number(label.dataset.anchorX) / 100 * bounds.width - label.offsetWidth / 2,
        y: Number(label.dataset.anchorY) / 100 * bounds.height - label.offsetHeight / 2,
        width: label.offsetWidth, height: label.offsetHeight };
    });
    const positions = placeNeighborhoodLabels(bounds.width, bounds.height, boxes, obstacles, Math.max(bounds.width * .35, 108));
    labels.forEach((label, index) => {
      const position = positions[index];
      label.hidden = !position;
      if (position) { label.style.left = `${position.x}px`; label.style.top = `${position.y}px`; }
    });
  };
  const observer = new ResizeObserver(layout);
  observer.observe(map);
  void document.fonts.ready.then(layout);
  return layout;
}
