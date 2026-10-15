// Job runner: opens a job's mini-game as a screen, scores it in stars, then shows the pay and lets
// the kid collect it (econ.earn -> coins fly to the wallet). Pay is fixed per star, never random.
import { t, tf, fmt } from '../i18n.js';
import { el, button, toastError } from '../ui/widgets.js';
import { openScreen, closeScreen } from '../ui/screens.js';
import { play as shelves } from './shelves.js';
import './jobs.css';

const GAMES = { shelves };

// 3 stars: everything placed with at most 1 mistake; 2: most of it; 1: tried.
export function starsFor({ placed, mistakes, done }, job) {
  if (done && mistakes <= 1) return 3;
  if (placed >= Math.ceil(job.target * 0.7)) return 2;
  return 1;
}

export function startJob({ econ, jobs, jobId }) {
  const job = jobs[jobId], game = GAMES[job?.game];
  if (!game) return;
  const can = econ.canEarn(jobId);
  if (!can.ok) return toastError(can.error);

  openScreen(job.name, (body) => {
    let stop = game(body, job, (res) => {
      stop = null;
      results(body, res);
    });
    return () => stop?.();
  }, { cls: 'job' });

  function results(body, res) {
    const stars = starsFor(res, job);
    const pay = job.pay + (job.starBonus ?? 0) * (stars - 1);
    body.replaceChildren();
    const box = el('div', 'job-result', body);
    el('h3', '', box, res.done ? t('job.done') : t('job.timeup'));
    el('div', 'stars', box, '★'.repeat(stars) + '☆'.repeat(3 - stars));
    el('p', '', box, tf('job.placed', { n: fmt(res.placed), m: fmt(job.target) }));
    el('p', 'pay', box, tf('job.pay', { n: fmt(pay) }));
    button(box, t('job.collect'), () => {
      const r = econ.earn(jobId, stars);
      if (!r.ok) toastError(r.error);
      closeScreen();
    }, 'primary big');
  }
}
