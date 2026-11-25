// The landing map's second view: real Taichung, which folds into the game map and back around Taiwan Blvd.
// Loaded only when the map is near the screen (it brings a picture and the drawing code with it).
import foldData from './data/real-map.json';
import realArt from './assets/boulevard/real.webp';
import { boulevardPoints, ease, foldDuration, foldPoint, meshTriangles, nearerView, pinScale, ramp } from './map-fold';
import type { MapView, RealMapData } from './map-fold';

const data = foldData as unknown as RealMapData;
const OUTSIDE = [0x35 / 255, 0x3e / 255, 0x46 / 255] as const;   // the game map's own surround
const LINE_BOX = [1000, 1000 * 256 / 353] as const;               // the boulevard line's drawing box (the map's shape)

export interface RealMapParts {
  /** The map frame; pins inside it carry data-pin, data-x and data-y (their game position, in percent). */
  map: HTMLElement;
  canvas: HTMLCanvasElement;
  /** The game map picture already on the page, and an empty <img> for the real one. */
  gameArt: HTMLImageElement;
  realArt: HTMLImageElement;
  /** The polylines that trace Taiwan Blvd. */
  boulevard: SVGPolylineElement[];
  /** The real map's scale bar: sized here to two kilometres. */
  scaleBar: HTMLElement;
  reducedMotion: () => boolean;
  /** Called whenever the frame changes which map it is nearer to, and when a fold comes to rest. */
  onView(view: MapView, settled: boolean): void;
}

function program(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const made = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    gl.attachShader(made, shader);
  }
  gl.linkProgram(made);
  if (!gl.getProgramParameter(made, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(made) ?? 'program');
  return made;
}

function loaded(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    if (image.complete && image.naturalWidth) { resolve(); return; }
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error('map picture')), { once: true });
  });
}

/** Sets the real view up on the map frame. `ready` resolves once both pictures are in. */
export function createRealMap(parts: RealMapParts) {
  const { map, canvas, gameArt, boulevard } = parts;
  let fold = 1;                  // the page opens on the game map
  let target = 1;
  let frame = 0;
  let lastView: MapView = 'game';
  let touched = false;           // the visitor has used the map or its switch: no more moves on our own
  let tour = 0;                  // the timer behind the one move the map makes by itself
  let gl: WebGLRenderingContext | null = null;
  let draw3d: (() => void) | undefined;

  parts.scaleBar.style.width = `${(200 / data.sheet.kmWide).toFixed(2)}%`;
  parts.realArt.decoding = 'async';
  parts.realArt.src = realArt;

  function layout() {
    const onRealMap = Number.parseFloat(getComputedStyle(map).getPropertyValue('--lp-pin-real')) || .62;
    map.style.setProperty('--lp-pin-k', pinScale(fold, onRealMap).toFixed(3));
    map.style.setProperty('--lp-game', ramp(.55, .95, fold).toFixed(3));     // what belongs to the game map only: neighbourhood names
    map.style.setProperty('--lp-real', (1 - ramp(.05, .5, fold)).toFixed(3)); // what belongs to the real map only: north arrow, scale bar
    map.querySelectorAll<HTMLElement>('[data-pin]').forEach((pin) => {
      const real = data.places[pin.dataset.pin!];
      const game = [Number(pin.dataset.x) / 100, Number(pin.dataset.y) / 100];
      const [x, y] = real ? foldPoint(real, game, fold) : game;
      pin.style.left = `${(x * 100).toFixed(3)}%`;
      pin.style.top = `${(y * 100).toFixed(3)}%`;
    });
    const line = boulevardPoints(data, fold, LINE_BOX[0], LINE_BOX[1]);
    boulevard.forEach((polyline) => polyline.setAttribute('points', line));
    parts.realArt.style.opacity = (1 - ramp(.3, .7, fold)).toFixed(3);       // the plain cross-fade: all there is where WebGL is missing
  }

  function render() {
    layout();
    draw3d?.();
    const view = nearerView(fold);
    const settled = fold === target;
    if (view !== lastView || settled) { lastView = view; parts.onView(view, settled); }
  }

  function setUp3d() {
    const context = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!context) return;
    gl = context;
    const { columns, rows, game, real } = data.mesh;
    const corners = new Float32Array(columns * rows * 4);
    for (let corner = 0; corner < columns * rows; corner++) corners.set([game[corner * 2], game[corner * 2 + 1], real[corner * 2], real[corner * 2 + 1]], corner * 4);
    const triangles = meshTriangles(columns, rows);
    const cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    const triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
    const sheetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    // The game's ground: each grid corner slides from its real spot to its game spot; the picture cross-fades late.
    const ground = program(gl,
      'attribute vec2 aGame; attribute vec2 aReal; uniform float uFold; varying vec2 vGame; varying vec2 vReal;'
      + 'void main(){ vec2 p = mix(aReal, aGame, uFold); vGame = aGame; vReal = aReal; gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }',
      'precision mediump float; uniform sampler2D uRealMap; uniform sampler2D uGameMap; uniform float uMix; varying vec2 vGame; varying vec2 vReal;'
      + 'void main(){ gl_FragColor = vec4(mix(texture2D(uRealMap, vReal).rgb, texture2D(uGameMap, vGame).rgb, uMix), 1.0); }');
    // The whole real sheet behind it, fading away as the game's ground lifts out.
    const sheet = program(gl,
      'attribute vec2 aCorner; varying vec2 vAt; void main(){ vAt = aCorner; gl_Position = vec4(aCorner.x * 2.0 - 1.0, 1.0 - aCorner.y * 2.0, 0.0, 1.0); }',
      'precision mediump float; uniform sampler2D uRealMap; uniform float uShow; varying vec2 vAt; void main(){ gl_FragColor = vec4(texture2D(uRealMap, vAt).rgb, uShow); }');
    const upload = (unit: number, image: HTMLImageElement) => {
      gl!.activeTexture(gl!.TEXTURE0 + unit);
      gl!.bindTexture(gl!.TEXTURE_2D, gl!.createTexture());
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, image);
      for (const [name, value] of [[gl!.TEXTURE_MIN_FILTER, gl!.LINEAR], [gl!.TEXTURE_MAG_FILTER, gl!.LINEAR], [gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE], [gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE]] as const) gl!.texParameteri(gl!.TEXTURE_2D, name, value);
    };
    upload(0, parts.realArt);
    upload(1, gameArt);
    draw3d = () => {
      const context3d = gl!;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      // Sized from the frame, not the canvas: the canvas stays hidden (and so has no size) until its first picture.
      const width = Math.round(map.clientWidth * scale);
      const height = Math.round(map.clientHeight * scale);
      if (!width || !height) return;
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context3d.viewport(0, 0, width, height);
      context3d.clearColor(OUTSIDE[0], OUTSIDE[1], OUTSIDE[2], 1);
      context3d.clear(context3d.COLOR_BUFFER_BIT);
      context3d.enable(context3d.BLEND);
      context3d.blendFunc(context3d.SRC_ALPHA, context3d.ONE_MINUS_SRC_ALPHA);
      context3d.useProgram(sheet);
      context3d.bindBuffer(context3d.ARRAY_BUFFER, sheetBuffer);
      const corner = context3d.getAttribLocation(sheet, 'aCorner');
      context3d.enableVertexAttribArray(corner);
      context3d.vertexAttribPointer(corner, 2, context3d.FLOAT, false, 0, 0);
      context3d.uniform1i(context3d.getUniformLocation(sheet, 'uRealMap'), 0);
      context3d.uniform1f(context3d.getUniformLocation(sheet, 'uShow'), 1 - ramp(.02, .5, fold));
      context3d.drawArrays(context3d.TRIANGLE_STRIP, 0, 4);
      context3d.disableVertexAttribArray(corner);
      context3d.disable(context3d.BLEND);
      context3d.useProgram(ground);
      context3d.bindBuffer(context3d.ARRAY_BUFFER, cornerBuffer);
      context3d.bindBuffer(context3d.ELEMENT_ARRAY_BUFFER, triangleBuffer);
      for (const [name, offset] of [['aGame', 0], ['aReal', 8]] as const) {
        const at = context3d.getAttribLocation(ground, name);
        context3d.enableVertexAttribArray(at);
        context3d.vertexAttribPointer(at, 2, context3d.FLOAT, false, 16, offset);
      }
      context3d.uniform1i(context3d.getUniformLocation(ground, 'uRealMap'), 0);
      context3d.uniform1i(context3d.getUniformLocation(ground, 'uGameMap'), 1);
      context3d.uniform1f(context3d.getUniformLocation(ground, 'uFold'), ease(fold));
      context3d.uniform1f(context3d.getUniformLocation(ground, 'uMix'), ramp(.55, .95, fold));
      context3d.drawElements(context3d.TRIANGLES, triangles.length, context3d.UNSIGNED_SHORT, 0);
      canvas.hidden = false;
    };
  }

  /** Fold to one of the two maps. `animate` false jumps there. */
  function show(view: MapView, animate = true) {
    target = view === 'game' ? 1 : 0;
    cancelAnimationFrame(frame);
    const from = fold;
    const duration = animate && !parts.reducedMotion() ? foldDuration(from, target) : 0;
    if (!duration) { fold = target; render(); return; }
    const started = performance.now();
    const step = (now: number) => {
      const done = Math.min(1, (now - started) / duration);
      fold = done === 1 ? target : from + (target - from) * done;
      render();
      if (done < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  const ready = Promise.all([loaded(parts.realArt), loaded(gameArt)]).then(() => {
    parts.realArt.hidden = false;
    try { setUp3d(); } catch { gl = null; draw3d = undefined; canvas.hidden = true; }
    render();
    // The one move the map makes on its own, once, unless motion is unwanted or the visitor got there first.
    if (parts.reducedMotion() || touched) return;
    const bounds = map.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      // Already on screen (it leads the page): a look at the real city, then back to the game.
      tour = window.setTimeout(() => {
        show('real');
        tour = window.setTimeout(() => show('game'), foldDuration(1, 0) + 1800);
      }, 1200);
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    // Still off screen: wait on the real city and fold into the game the first time it is properly in view.
    show('real', false);
    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watcher.disconnect();
      tour = window.setTimeout(() => show('game'), 900);
    }, { threshold: .6 });
    watcher.observe(map);
  });

  // Any touch of the map ends the tour: the frame goes back to the game and stays where the visitor puts it.
  function takeOver() {
    if (touched) return;
    touched = true;
    window.clearTimeout(tour);
    if (target === 0) show('game');
  }
  map.addEventListener('pointerdown', takeOver);
  map.addEventListener('keydown', takeOver);

  new ResizeObserver(() => render()).observe(map);

  return {
    ready,
    /** The switch was used: go there and stop moving on our own. */
    choose(view: MapView) { touched = true; window.clearTimeout(tour); show(view); },
    /** Re-apply the current position after the pins are redrawn. */
    layout: render,
    view: () => nearerView(fold),
  };
}
