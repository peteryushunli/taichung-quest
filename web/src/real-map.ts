// The landing map's second view: real Taichung, which folds into the game map and back. Taiwan Blvd lies level on
// both. The real view is drawn turned (the boulevard flat, as in the game); its compass turns it north-up and back.
// Loaded only when the map is near the screen (it brings a picture and the drawing code with it).
import foldData from './data/real-map.json';
import realArt from './assets/boulevard/real.webp';
import { boulevardPoints, clamp01, ease, foldDuration, foldPoint, meshTriangles, nearerView, pinScale, ramp, spreadPins, turnPoint } from './map-fold';
import type { MapView, RealMapData } from './map-fold';

const data = foldData as unknown as RealMapData;
const OUTSIDE = [0x35 / 255, 0x3e / 255, 0x46 / 255] as const;   // the game map's own surround
const LINE_BOX = [1000, 1000 * 256 / 353] as const;               // the boulevard line's drawing box (the map's shape)
const PICTURE = data.sheet.picture;                               // the real picture reaches beyond the frame (0..1) on every side
const TURN_TIME = 800;                                            // a full turn to north-up, in milliseconds
// Shared by both drawing programs: a point of the frame, turned about the frame's middle (see turnPoint).
const TURNED = 'uniform vec2 uTurn; uniform float uShape;'
  + 'vec2 turned(vec2 p){ vec2 d = vec2((p.x - 0.5) * uShape, p.y - 0.5); return vec2(0.5 + (d.x * uTurn.x - d.y * uTurn.y) / uShape, 0.5 + d.x * uTurn.y + d.y * uTurn.x); }';

export interface RealMapParts {
  /** The map frame; pins inside it carry data-pin, data-x and data-y (their game position, in percent). */
  map: HTMLElement;
  canvas: HTMLCanvasElement;
  /** The game map picture already on the page, and an empty <img> for the real one. */
  gameArt: HTMLImageElement;
  realArt: HTMLImageElement;
  /** The polylines that trace Taiwan Blvd. */
  boulevard: SVGPolylineElement[];
  /** The marker on the middle of Taiwan Blvd; it slides with the fold. */
  anchor: HTMLElement;
  /** The compass: pressed, it turns the real map until north points up; pressed again, back. */
  north: HTMLButtonElement;
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
  let turn = 0;                  // 0 as drawn (Taiwan Blvd flat), 1 turned until north points up
  let turnTarget = 0;
  let turnFrame = 0;
  let lastView: MapView = 'game';
  let touched = false;           // the visitor has used the map or its switch: no more moves on our own
  let tour = 0;                  // the timer behind the one move the map makes by itself
  let gl: WebGLRenderingContext | null = null;
  let draw3d: (() => void) | undefined;

  parts.scaleBar.style.width = `${(200 / data.sheet.kmWide).toFixed(2)}%`;
  parts.realArt.decoding = 'async';
  parts.realArt.src = realArt;
  // The plain picture (all there is where WebGL is missing) sits where the drawn one does: larger than the frame, centred on it.
  Object.assign(parts.realArt.style, {
    left: `${PICTURE[0] * 100}%`, top: `${PICTURE[1] * 100}%`, maxWidth: 'none',
    width: `${(PICTURE[2] - PICTURE[0]) * 100}%`, height: `${(PICTURE[3] - PICTURE[1]) * 100}%`,
  });

  /** Where each pin stands on the two maps, with crowded pins nudged apart. Worked out once per map size. */
  let stands: { key: string; size: number; game: Map<string, number[]>; real: Map<string, number[]> } | undefined;
  function pinStands(onRealMap: number) {
    const pins = [...map.querySelectorAll<HTMLElement>('[data-pin]')];
    const width = map.clientWidth;
    const height = map.clientHeight;
    const size = pins[0]?.querySelector<HTMLElement>('.lp-marker')?.offsetWidth ?? 26;
    const key = `${width}x${height}:${size}:${onRealMap}:${pins.map((pin) => pin.dataset.pin).join()}`;
    if (stands?.key === key) return stands;
    const held = pins.map((pin) => pin.parentElement?.dataset.mapLayer === 'gyms');
    const game = pins.map((pin) => [Number(pin.dataset.x) / 100, Number(pin.dataset.y) / 100]);
    const real = pins.map((pin, index) => data.places[pin.dataset.pin!] ?? game[index]);
    // `across` is a pin's width on that map: pins keep that much between their middles, so none covers another,
    // may step up to one and a half pins from their true spot to find the room, and stay whole inside the frame
    // (a place that really lies beyond the real view waits at the edge nearest to it).
    const settle = (points: number[][], across: number) => new Map(spreadPins(points.map(([x, y]) => [x * width, y * height] as const),
      across, held, { width, height, inset: across / 2 + 1 }, across * 1.5)
      .map(([x, y], index) => [pins[index].dataset.pin!, width && height ? [x / width, y / height] : points[index]]));
    stands = { key, size, game: settle(game, size), real: settle(real, size * onRealMap) };
    return stands;
  }

  function layout() {
    const onRealMap = Number.parseFloat(getComputedStyle(map).getPropertyValue('--lp-pin-real')) || .62;
    const { game: gameStand, real: realStand, size } = pinStands(onRealMap);
    const width = map.clientWidth || LINE_BOX[0];
    const height = map.clientHeight || LINE_BOX[1];
    const shape = width / height;
    const degrees = data.sheet.turnedDegrees * ease(turn);
    const scale = pinScale(fold, onRealMap);
    // A turned pin may swing past the frame's edge: it is kept whole inside, as an unturned one is.
    const insetX = (size * scale / 2 + 1) / width;
    const insetY = (size * scale / 2 + 1) / height;
    map.style.setProperty('--lp-pin-k', scale.toFixed(3));
    map.style.setProperty('--lp-game', ramp(.55, .95, fold).toFixed(3));     // what belongs to the game map only: neighbourhood names
    map.style.setProperty('--lp-real', (1 - ramp(.05, .5, fold)).toFixed(3)); // what belongs to the real map only: compass, scale bar
    map.style.setProperty('--lp-turn', `${degrees.toFixed(2)}deg`);          // the compass needle follows the turn
    map.querySelectorAll<HTMLElement>('[data-pin]').forEach((pin) => {
      let [x, y] = foldPoint(realStand.get(pin.dataset.pin!)!, gameStand.get(pin.dataset.pin!)!, fold);
      if (degrees) {
        [x, y] = turnPoint([x, y], degrees, shape);
        x = Math.min(Math.max(x, insetX), 1 - insetX);
        y = Math.min(Math.max(y, insetY), 1 - insetY);
      }
      pin.style.left = `${(x * 100).toFixed(3)}%`;
      pin.style.top = `${(y * 100).toFixed(3)}%`;
    });
    const [anchorX, anchorY] = turnPoint(foldPoint(data.anchor.real, data.anchor.game, fold), degrees, shape);
    parts.anchor.style.left = `${(anchorX * 100).toFixed(3)}%`;
    parts.anchor.style.top = `${(anchorY * 100).toFixed(3)}%`;
    const line = boulevardPoints(data, fold, LINE_BOX[0], LINE_BOX[1]);
    boulevard.forEach((polyline) => polyline.setAttribute('points', line));
    const turned = degrees ? `rotate(${degrees.toFixed(2)}deg)` : '';
    const lineArt = boulevard[0]?.ownerSVGElement;
    if (lineArt) lineArt.style.transform = turned;
    parts.realArt.style.transform = turned;
    parts.realArt.style.opacity = (1 - ramp(.3, .7, fold)).toFixed(3);       // the plain cross-fade: all there is where WebGL is missing
    parts.north.disabled = nearerView(fold) !== 'real';                      // the compass belongs to the real map
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
    // The whole picture's four corners: where each lies around the frame, and which corner of the picture it is.
    const sheetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      PICTURE[0], PICTURE[1], 0, 0, PICTURE[2], PICTURE[1], 1, 0, PICTURE[0], PICTURE[3], 0, 1, PICTURE[2], PICTURE[3], 1, 1,
    ]), gl.STATIC_DRAW);
    // The game's ground: each grid corner slides from its real spot to its game spot; the picture cross-fades late.
    const ground = program(gl,
      `attribute vec2 aGame; attribute vec2 aReal; uniform float uFold; uniform vec4 uPicture; varying vec2 vGame; varying vec2 vReal; ${TURNED}`
      + 'void main(){ vec2 p = turned(mix(aReal, aGame, uFold)); vGame = aGame; vReal = (aReal - uPicture.xy) / (uPicture.zw - uPicture.xy);'
      + ' gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }',
      'precision mediump float; uniform sampler2D uRealMap; uniform sampler2D uGameMap; uniform float uMix; varying vec2 vGame; varying vec2 vReal;'
      + 'void main(){ gl_FragColor = vec4(mix(texture2D(uRealMap, vReal).rgb, texture2D(uGameMap, vGame).rgb, uMix), 1.0); }');
    // The whole real picture behind it, fading away as the game's ground lifts out.
    const sheet = program(gl,
      `attribute vec2 aCorner; attribute vec2 aAt; varying vec2 vAt; ${TURNED}`
      + 'void main(){ vec2 p = turned(aCorner); vAt = aAt; gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }',
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
      const angle = data.sheet.turnedDegrees * ease(turn) * Math.PI / 180;
      const turnOf = (made: WebGLProgram) => {
        context3d.uniform2f(context3d.getUniformLocation(made, 'uTurn'), Math.cos(angle), Math.sin(angle));
        context3d.uniform1f(context3d.getUniformLocation(made, 'uShape'), width / height);
      };
      context3d.viewport(0, 0, width, height);
      context3d.clearColor(OUTSIDE[0], OUTSIDE[1], OUTSIDE[2], 1);
      context3d.clear(context3d.COLOR_BUFFER_BIT);
      context3d.enable(context3d.BLEND);
      context3d.blendFunc(context3d.SRC_ALPHA, context3d.ONE_MINUS_SRC_ALPHA);
      context3d.useProgram(sheet);
      context3d.bindBuffer(context3d.ARRAY_BUFFER, sheetBuffer);
      const sheetAt = [['aCorner', 0], ['aAt', 8]].map(([name, offset]) => {
        const at = context3d.getAttribLocation(sheet, name as string);
        context3d.enableVertexAttribArray(at);
        context3d.vertexAttribPointer(at, 2, context3d.FLOAT, false, 16, offset as number);
        return at;
      });
      turnOf(sheet);
      context3d.uniform1i(context3d.getUniformLocation(sheet, 'uRealMap'), 0);
      context3d.uniform1f(context3d.getUniformLocation(sheet, 'uShow'), 1 - ramp(.02, .5, fold));
      context3d.drawArrays(context3d.TRIANGLE_STRIP, 0, 4);
      sheetAt.forEach((at) => context3d.disableVertexAttribArray(at));
      context3d.disable(context3d.BLEND);
      context3d.useProgram(ground);
      context3d.bindBuffer(context3d.ARRAY_BUFFER, cornerBuffer);
      context3d.bindBuffer(context3d.ELEMENT_ARRAY_BUFFER, triangleBuffer);
      for (const [name, offset] of [['aGame', 0], ['aReal', 8]] as const) {
        const at = context3d.getAttribLocation(ground, name);
        context3d.enableVertexAttribArray(at);
        context3d.vertexAttribPointer(at, 2, context3d.FLOAT, false, 16, offset);
      }
      turnOf(ground);
      context3d.uniform4f(context3d.getUniformLocation(ground, 'uPicture'), PICTURE[0], PICTURE[1], PICTURE[2], PICTURE[3]);
      context3d.uniform1i(context3d.getUniformLocation(ground, 'uRealMap'), 0);
      context3d.uniform1i(context3d.getUniformLocation(ground, 'uGameMap'), 1);
      context3d.uniform1f(context3d.getUniformLocation(ground, 'uFold'), ease(fold));
      context3d.uniform1f(context3d.getUniformLocation(ground, 'uMix'), ramp(.55, .95, fold));
      context3d.drawElements(context3d.TRIANGLES, triangles.length, context3d.UNSIGNED_SHORT, 0);
      canvas.hidden = false;
    };
  }

  /** Turn the real map north-up (1) or back to how it is drawn, with Taiwan Blvd flat (0). */
  function spin(to: number) {
    turnTarget = to;
    parts.north.setAttribute('aria-pressed', String(to === 1));
    cancelAnimationFrame(turnFrame);
    const from = turn;
    const duration = parts.reducedMotion() ? 0 : TURN_TIME * Math.abs(to - from);
    if (!duration) { turn = to; render(); return; }
    const started = performance.now();
    const step = (now: number) => {
      const done = clamp01((now - started) / duration);
      turn = done === 1 ? to : from + (to - from) * done;
      render();
      if (done < 1) turnFrame = requestAnimationFrame(step);
    };
    turnFrame = requestAnimationFrame(step);
  }

  /** Fold to one of the two maps. `animate` false jumps there. */
  function show(view: MapView, animate = true) {
    target = view === 'game' ? 1 : 0;
    if (view === 'game' && turnTarget) spin(0);   // the game map is only ever drawn one way up
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
  // The compass is the exception: it belongs to the real map, so using it keeps that map up.
  function takeOver(event: Event) {
    if (touched) return;
    touched = true;
    window.clearTimeout(tour);
    if (target === 0 && !(event.target instanceof Node && parts.north.contains(event.target))) show('game');
  }
  map.addEventListener('pointerdown', takeOver);
  map.addEventListener('keydown', takeOver);
  parts.north.addEventListener('click', () => {
    touched = true;
    window.clearTimeout(tour);
    if (target === 0) spin(turnTarget ? 0 : 1);
  });

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
