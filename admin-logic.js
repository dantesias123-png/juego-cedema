// ══════════════════════════════════════════════
//  ESTADO POR DEFECTO
// ══════════════════════════════════════════════
function buildDefaultState(questionBank) {
  const axes = {};
  for (const axisName of Object.keys(questionBank)) {
    axes[axisName] = {
      enabled: true,
      questions: questionBank[axisName].map(() => true)
    };
  }
  return { axes };
}

// ══════════════════════════════════════════════
//  RESUMEN EN VIVO
// ══════════════════════════════════════════════
function computeSummary(questionBank, state) {
  let axesUsed = 0;
  for (const axisName of Object.keys(questionBank)) {
    const axisState = state.axes[axisName];
    if (!axisState || !axisState.enabled) continue;
    if (axisState.questions.some(Boolean)) axesUsed++;
  }
  return { axesUsed };
}

// ══════════════════════════════════════════════
//  SERIALIZACIÓN / IMPORTACIÓN DE config.js
// ══════════════════════════════════════════════
function serializeStateToConfig(state) {
  const disabledAxes = [];
  const disabledQuestions = {};

  for (const axisName of Object.keys(state.axes)) {
    const axisState = state.axes[axisName];
    if (!axisState.enabled) {
      disabledAxes.push(axisName);
    }
    const disabledIndices = axisState.questions
      .map((enabled, index) => (enabled ? -1 : index))
      .filter(index => index !== -1);
    if (disabledIndices.length > 0) {
      disabledQuestions[axisName] = disabledIndices;
    }
  }

  return { disabledAxes, disabledQuestions };
}

function applyConfigToState(questionBank, gameConfig) {
  const state = buildDefaultState(questionBank);
  const disabledAxes = gameConfig.disabledAxes || [];
  const disabledQuestions = gameConfig.disabledQuestions || {};

  for (const axisName of disabledAxes) {
    if (state.axes[axisName]) {
      state.axes[axisName].enabled = false;
    }
  }
  for (const axisName of Object.keys(disabledQuestions)) {
    if (!state.axes[axisName]) continue;
    for (const index of disabledQuestions[axisName]) {
      if (index >= 0 && index < state.axes[axisName].questions.length) {
        state.axes[axisName].questions[index] = false;
      }
    }
  }
  return state;
}

function configObjectToFileText(gameConfig) {
  const body = JSON.stringify(gameConfig, null, 2);
  return `const gameConfig = ${body};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { gameConfig };\n}\n`;
}

function parseConfigFileText(text) {
  const moduleShim = { exports: {} };
  try {
    const runner = new Function('module', 'exports', text);
    runner(moduleShim, moduleShim.exports);
  } catch (err) {
    throw new Error('El archivo no es un config.js válido (error de sintaxis): ' + err.message);
  }
  const gameConfig = moduleShim.exports && moduleShim.exports.gameConfig;
  if (!gameConfig || typeof gameConfig !== 'object') {
    throw new Error('El archivo no exporta un gameConfig válido.');
  }
  if (!Array.isArray(gameConfig.disabledAxes) || typeof gameConfig.disabledQuestions !== 'object') {
    throw new Error('El gameConfig no tiene el formato esperado (disabledAxes/disabledQuestions).');
  }
  return gameConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildDefaultState,
    computeSummary,
    serializeStateToConfig,
    applyConfigToState,
    configObjectToFileText,
    parseConfigFileText
  };
}
