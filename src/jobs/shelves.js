// Shelf-stocking mini-game (DOM). Products come one at a time; drag each onto its shelf (or tap the
// product, then the shelf). `target` products before `seconds` run out. Content from jobs.json.
// play(body, job, onEnd({ placed, mistakes, timeLeft })). Returns a cleanup fn.
import { t, tf, fmt } from '../i18n.js';
import { el } from '../ui/widgets.js';

export function play(body, job, onEnd) {
  const root = el('div', 'shelves-game', body);
  const top = el('div', 'sg-top', root);
  const left = el('b', 'sg-left', top);
  const timer = el('b', 'sg-time', top);
  const shelvesEl = el('div', 'sg-shelves', root);
  const tray = el('div', 'sg-tray', root);
  el('small', 'sg-hint', root, t('job.hint'));

  const shelves = job.shelves.map((s, i) => {
    const sh = el('div', 'sg-shelf', shelvesEl);
    sh.style.background = s.color;
    sh.dataset.i = i;
    el('b', 'sg-name', sh, s.name);
    el('div', 'sg-stock', sh);
    sh.onclick = () => { if (selected) drop(i); };
    return sh;
  });

  // a shuffled queue of products: target items spread over all shelves (order only, no money is random)
  const queue = [];
  for (let k = 0; k < job.target; k++) {
    const si = k % job.shelves.length, items = job.shelves[si].items;
    queue.push({ si, icon: items[Math.floor(Math.random() * items.length)] });
  }
  queue.sort(() => Math.random() - 0.5);

  let placed = 0, mistakes = 0, timeLeft = job.seconds, current = null, selected = false, over = false;
  const tick = setInterval(() => {
    timeLeft -= 1;
    draw();
    if (timeLeft <= 0) finish();
  }, 1000);

  function draw() {
    left.textContent = tf('job.left', { n: fmt(job.target - placed) });
    timer.textContent = tf('job.time', { n: fmt(Math.max(0, timeLeft)) });
    timer.classList.toggle('low', timeLeft <= 10);
  }

  function next() {
    current?.remove();
    selected = false;
    if (placed >= job.target) return finish();
    const item = queue[placed];
    current = el('div', 'sg-item', tray, item.icon);
    current.dataset.si = item.si;
    current.onpointerdown = grab;
  }

  // drag: the product follows the finger; release over a shelf drops it there. A tap selects it.
  function grab(e) {
    e.preventDefault();
    const it = current, sx = e.clientX, sy = e.clientY;
    let moved = false;
    it.setPointerCapture(e.pointerId);
    it.classList.add('held');
    it.onpointermove = (m) => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (Math.hypot(dx, dy) > 8) moved = true;
      it.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
    };
    it.onpointerup = (u) => {
      it.onpointermove = it.onpointerup = null;
      it.classList.remove('held');
      it.style.transform = '';
      if (!moved) { selected = !selected; it.classList.toggle('picked', selected); return; }
      const hit = document.elementsFromPoint(u.clientX, u.clientY).find((x) => x.classList?.contains('sg-shelf'));
      if (hit) drop(+hit.dataset.i);
    };
  }

  function drop(si) {
    if (over || !current) return;
    const sh = shelves[si];
    if (+current.dataset.si === si) {
      el('span', 'sg-put', sh.querySelector('.sg-stock'), current.textContent);
      sh.classList.remove('ok');
      void sh.offsetWidth;
      sh.classList.add('ok');
      placed++;
      draw();
      next();
    } else {
      mistakes++;
      sh.classList.remove('no');
      void sh.offsetWidth;
      sh.classList.add('no');
      current.classList.remove('picked');
      selected = false;
    }
  }

  function finish() {
    if (over) return;
    over = true;
    clearInterval(tick);
    current?.remove();
    onEnd({ placed, mistakes, timeLeft: Math.max(0, timeLeft), done: placed >= job.target });
  }

  draw();
  next();
  return () => { over = true; clearInterval(tick); };
}
