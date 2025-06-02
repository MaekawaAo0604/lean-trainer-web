// src/modules/storage.js
const HIT_KEY = "lean-trainer-hits";
const SUCCESS_KEY = "lean-trainer-successes";

export function saveHit() {
  const hits = Number(localStorage.getItem(HIT_KEY) || 0) + 1;
  localStorage.setItem(HIT_KEY, hits.toString());
}

export function saveSuccess() {
  const succ = Number(localStorage.getItem(SUCCESS_KEY) || 0) + 1;
  localStorage.setItem(SUCCESS_KEY, succ.toString());
}

export function getStats() {
  return {
    hits: Number(localStorage.getItem(HIT_KEY) || 0),
    successes: Number(localStorage.getItem(SUCCESS_KEY) || 0),
  };
}
