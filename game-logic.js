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

// ══════════════════════════════════════════════
//  ARMADO DE LA PARTIDA
// ══════════════════════════════════════════════
function resolveGameAxes(questionBank, gameConfig) {
  const disabledAxes = (gameConfig && gameConfig.disabledAxes) || [];
  let axes = Object.keys(questionBank).filter(axis => !disabledAxes.includes(axis));
  if (axes.length === 0) {
    console.warn('gameConfig.disabledAxes deja 0 ejes disponibles; se usan todos los ejes.');
    axes = Object.keys(questionBank);
  }
  return axes;
}

function buildGame(questionBank, gameConfig) {
  const config = gameConfig || { disabledAxes: [], disabledQuestions: {} };
  const disabledQuestions = config.disabledQuestions || {};
  const axes = resolveGameAxes(questionBank, config);

  const selected = [];
  for (const axis of axes) {
    const disabledIndices = disabledQuestions[axis] || [];
    const pool = questionBank[axis]
      .map((question, index) => ({ question, index }))
      .filter(item => !disabledIndices.includes(item.index));

    if (pool.length === 0) {
      console.warn(`El eje "${axis}" no tiene preguntas habilitadas; se excluye de esta partida.`);
      continue;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)].question;
    const { options, correct } = shuffleOptions(chosen);
    selected.push({ axis, q: chosen.q, options, correct });
  }

  return shuffle(selected);
}

// ══════════════════════════════════════════════
//  PREMIOS Y MENSAJES DE RESULTADO
// ══════════════════════════════════════════════
function computePercentage(score, total) {
  if (total <= 0) return 0;
  return Math.round((score / total) * 100);
}

function computePrizeTier(score, total) {
  const pct = computePercentage(score, total);
  if (pct >= 100) return { pct, tier: 'complete', label: 'BECA COMPLETA (100%)' };
  if (pct >= 80) return { pct, tier: 'half', label: 'BECA DEL 50%' };
  if (pct >= 60) return { pct, tier: 'quarter', label: 'BECA DEL 25%' };
  return { pct, tier: 'none', label: null };
}

function getResultMessage(score, total) {
  const pct = computePercentage(score, total);
  if (pct >= 100) return { title: '¡Resultado perfecto! 🏆', subtitle: '¡Conocés las Relaciones Internacionales a un nivel de experto!' };
  if (pct >= 80) return { title: '¡Excelente resultado!', subtitle: 'Tu nivel de análisis geopolítico es notable. ¡Felicitaciones!' };
  if (pct >= 60) return { title: '¡Muy buen desempeño!', subtitle: 'Dominás los temas clave de la política internacional contemporánea.' };
  if (pct >= 40) return { title: 'Conocimiento en construcción', subtitle: '¡Estás desarrollando una mirada geopolítica interesante!' };
  if (pct >= 20) return { title: 'Vas por buen camino', subtitle: '¡Cada pregunta es una oportunidad de aprendizaje!' };
  return { title: 'Buen primer paso', subtitle: 'Las Relaciones Internacionales tienen mucho para ofrecerte. ¡Seguí explorando!' };
}

// ══════════════════════════════════════════════
//  REGISTRO DE BECAS (payload para Google Sheets)
// ══════════════════════════════════════════════
function buildRegistryPayload(code, score, total, prizeTier) {
  return {
    code,
    score,
    total,
    pct: prizeTier.pct,
    tier: prizeTier.tier,
    label: prizeTier.label,
    timestamp: new Date().toISOString()
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LETTERS,
    shuffle,
    shuffleOptions,
    generateID,
    resolveGameAxes,
    buildGame,
    computePrizeTier,
    getResultMessage,
    buildRegistryPayload
  };
}
