// ══════════════════════════════════════════════
//  HELPERS DE ALEATORIEDAD
// ══════════════════════════════════════════════
const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(question) {
  const indexed = question.options.map((opt, i) => ({ text: opt, isCorrect: i === question.correct }));
  const shuffled = shuffle(indexed);
  return {
    options: shuffled.map(o => o.text),
    correct: shuffled.findIndex(o => o.isCorrect)
  };
}

function generateID() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CDM-${seg(4)}-${seg(4)}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LETTERS, shuffle, shuffleOptions, generateID };
}
