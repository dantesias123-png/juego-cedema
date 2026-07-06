// ══════════════════════════════════════════════
//  ESTADO DEL JUEGO
// ══════════════════════════════════════════════
let gameQuestions = [];
let currentQ = 0;
let score = 0;
let answers = [];

// ══════════════════════════════════════════════
//  LOGO (assets.js)
// ══════════════════════════════════════════════
document.querySelectorAll('.js-logo').forEach(img => {
  img.src = CEDEMA_LOGO_DATA_URI;
});

// ══════════════════════════════════════════════
//  ESTADÍSTICAS DE LA PANTALLA DE INICIO
// ══════════════════════════════════════════════
function updateIntroStats() {
  const axes = resolveGameAxes(questionBank, gameConfig);
  document.getElementById('intro-total-questions').textContent = `${axes.length} en total`;
}
updateIntroStats();

// ══════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ══════════════════════════════════════════════
let _currentScreenId = 'screen-splash';

function transitionTo(targetId, direction = 'right') {
  const current = document.getElementById(_currentScreenId);
  const target = document.getElementById(targetId);

  const exitClass = direction === 'right' ? 'exit-to-left' : 'exit-to-right';
  const enterClass = direction === 'right' ? 'enter-from-right' : 'enter-from-left';

  current.classList.add(exitClass);
  current.addEventListener('animationend', () => {
    current.classList.remove('active', exitClass);
  }, { once: true });

  target.classList.add('active', enterClass);
  target.addEventListener('animationend', () => {
    target.classList.remove(enterClass);
  }, { once: true });

  _currentScreenId = targetId;
}

function fadeTransitionTo(targetId) {
  const current = document.getElementById(_currentScreenId);
  const target = document.getElementById(targetId);

  current.classList.add('exit-to-left');
  current.addEventListener('animationend', () => {
    current.classList.remove('active', 'exit-to-left');
  }, { once: true });

  target.classList.add('active', 'fade-in');
  target.addEventListener('animationend', () => {
    target.classList.remove('fade-in');
  }, { once: true });

  _currentScreenId = targetId;
}

function leaveSplash() {
  const splash = document.getElementById('screen-splash');
  splash.classList.add('exit-splash');
  splash.addEventListener('animationend', () => {
    splash.classList.remove('active', 'exit-splash');
    splash.style.display = 'none';

    const start = document.getElementById('screen-start');
    start.classList.add('active', 'fade-in');
    start.addEventListener('animationend', () => start.classList.remove('fade-in'), { once: true });
    _currentScreenId = 'screen-start';
  }, { once: true });
}

// ══════════════════════════════════════════════
//  GAME FLOW
// ══════════════════════════════════════════════
function startGame() {
  gameQuestions = buildGame(questionBank, gameConfig);
  currentQ = 0;
  score = 0;
  answers = [];
  transitionTo('screen-game', 'right');
  setTimeout(renderQuestion, 50);
}

function goHome() {
  transitionTo('screen-start', 'left');
}

function renderQuestion() {
  const q = gameQuestions[currentQ];
  const total = gameQuestions.length;
  const progress = (currentQ / total) * 100;

  document.getElementById('progress-fill').style.width = progress + '%';
  document.getElementById('q-counter').textContent = `Pregunta ${currentQ + 1} de ${total}`;
  document.getElementById('q-score-live').textContent = `${score} correcta${score !== 1 ? 's' : ''}`;
  document.getElementById('axis-label').textContent = q.axis;
  document.getElementById('question-text').textContent = q.q;
  document.getElementById('feedback-row').textContent = '';
  document.getElementById('feedback-row').style.color = '';

  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-letter">${LETTERS[i]}</span><span>${opt}</span>`;
    btn.onclick = () => handleAnswer(i);
    grid.appendChild(btn);
  });
}

function handleAnswer(chosen) {
  const q = gameQuestions[currentQ];
  const total = gameQuestions.length;
  const buttons = document.querySelectorAll('.opt-btn');
  buttons.forEach(b => b.disabled = true);

  const isCorrect = chosen === q.correct;
  if (isCorrect) score++;
  answers.push(isCorrect);

  buttons[q.correct].classList.add('correct');
  if (!isCorrect) buttons[chosen].classList.add('wrong');

  const fb = document.getElementById('feedback-row');
  fb.textContent = isCorrect
    ? '✓ ¡Correcto!'
    : `✗ La respuesta correcta era: ${q.options[q.correct]}`;
  fb.style.color = isCorrect ? 'var(--green-dark)' : '#e74c3c';

  document.getElementById('progress-fill').style.width = ((currentQ + 1) / total * 100) + '%';
  document.getElementById('q-score-live').textContent = `${score} correcta${score !== 1 ? 's' : ''}`;

  setTimeout(() => {
    currentQ++;
    if (currentQ < total) {
      renderQuestion();
    } else {
      showResults();
    }
  }, 1800);
}

function showResults() {
  fadeTransitionTo('screen-results');
  setTimeout(() => {
    const total = gameQuestions.length;
    document.getElementById('final-score').textContent = score;
    document.getElementById('score-denom').textContent = `de ${total}`;

    const { title, subtitle } = getResultMessage(score, total);
    document.getElementById('result-msg').textContent = title;
    document.getElementById('result-sub').textContent = subtitle;

    const prize = computePrizeTier(score, total);
    const ps = document.getElementById('prize-section');
    if (prize.tier !== 'none') {
      const id = generateID();

      if (REGISTRY_WEBHOOK_URL) {
        const payload = buildRegistryPayload(id, score, total, prize);
        fetch(REGISTRY_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      let prizeTitle, emoji;
      if (prize.tier === 'complete') { prizeTitle = '🏆 BECA COMPLETA (100%) para cualquier formación académica de CEDEMA'; emoji = '🏆'; }
      else if (prize.tier === 'half') { prizeTitle = 'BECA DEL 50% para cualquier formación académica de CEDEMA'; emoji = '🎓'; }
      else { prizeTitle = 'BECA DEL 25% para cualquier formación académica de CEDEMA'; emoji = '🎓'; }
      ps.innerHTML = `
        <div class="prize-banner">
          <h2>${emoji} ¡Felicitaciones! Ganaste una beca</h2>
          <div class="prize-title">${prizeTitle}</div>
          <div class="validity">⏱ Válido por 12 meses — Canjeable en Instagram de CEDEMA de forma privada</div>
          <div class="code-block">
            <div>
              <span class="code-label">Tu código único</span>
              <span class="code-value">${id}</span>
              <span class="code-hint">📸 Tomá una foto de esta pantalla para canjearlo</span>
            </div>
            <span class="camera-icon">📱</span>
          </div>
          <div class="validity">ℹ️ No aplica automáticamente a cursos o talleres organizados en colaboración con instituciones aliadas. Consultá términos y condiciones.</div>
        </div>`;
    } else {
      ps.innerHTML = `
        <div class="no-prize-msg">
          <p>¡Gracias por participar! Con el 60% de aciertos o más podés ganar una beca de CEDEMA.</p>
          <p class="social">Seguinos en redes sociales para conocer todos nuestros programas académicos.</p>
        </div>`;
    }

    const dots = document.getElementById('breakdown-dots');
    dots.innerHTML = answers.map((ok, i) =>
      `<div class="dot ${ok ? 'correct' : 'wrong'}" style="animation-delay:${i * 0.06}s" title="${gameQuestions[i].axis}">${i + 1}</div>`
    ).join('');
  }, 100);
}
