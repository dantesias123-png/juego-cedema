# Registro de becas emitidas (Google Sheets) — Design Spec

## Goal

Cada vez que un jugador gana una beca (score ≥ 60%), registrar el código emitido en un Google Sheet controlado por el dueño del sitio (Dante), de forma que exista un registro central de todas las becas otorgadas — no solo las que se juegan localmente. Además, producir un manual de uso del sitio completo (juego + panel admin + este registro).

## Context

- El sitio (`index.html`/`app.js`) es estático, sin build step, sin backend propio. Se abre directamente o se sirve como archivos planos.
- `showResults()` en `app.js` ya calcula `computePrizeTier(score, total)` y genera un código único (`generateID()`, formato `CDM-XXXX-XXXX`) cuando `prize.tier !== 'none'`.
- `config.js` tiene un esquema fijo y testeado (`{disabledAxes, disabledQuestions}`) que `admin.html` descarga/sube para reconfigurar qué preguntas están habilitadas. Ese esquema **no debe** extenderse con datos de este feature — mezclar conceptos rompería el contrato ya testeado de `admin-logic.js` y el flujo de descarga/reemplazo de `config.js`.
- No se pide ni almacena ningún dato personal del jugador (constraint heredado del plan original).

## Non-goals

- No se construye backend propio (servidor, base de datos). Se usa Google Sheets + Apps Script como el único "backend".
- No se agregan campos al esquema de `config.js`.
- No se garantiza entrega (best-effort/fire-and-forget): si falla la red, el jugador nunca lo nota y el juego sigue funcionando exactamente igual que antes de este feature.
- No hay autenticación de quién juega; el registro es anónimo (solo código + puntaje + fecha).

## Architecture

### Nuevo archivo: `registry-config.js`

Mismo patrón que `config.js` (variable global + guard de Node), cargado con un `<script>` propio en `index.html`, **antes** de `app.js`:

```js
const REGISTRY_WEBHOOK_URL = "";

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REGISTRY_WEBHOOK_URL };
}
```

Vacío por defecto: si está vacío, el feature queda inactivo (el sitio funciona exactamente igual que hoy). Dante lo completa con la URL de su propio Apps Script una vez desplegado. Al ser un archivo separado de `config.js`, el flujo de descarga/reemplazo de configuración desde `admin.html` nunca lo toca ni lo pisa.

Nota de privacidad: esta URL no es una API key, pero permite escribir en el Sheet de cualquiera que la conozca. Si el repo llegase a ser público, se recomienda no commitear la URL real (dejar el placeholder vacío en git y setearla solo en el despliegue/local).

### Modificación: `game-logic.js` — `buildRegistryPayload` (pura, testeable)

```
buildRegistryPayload(code: string, score: number, total: number, prizeTier: {pct, tier, label}): 
  { code: string, score: number, total: number, pct: number, tier: string, label: string, timestamp: string }
```

Arma el objeto exacto que se manda al Sheet. `timestamp` es `new Date().toISOString()`. Pura función, sin DOM ni red — testeable igual que el resto de `game-logic.js`.

### Modificación: `app.js` — envío fire-and-forget

Dentro de `showResults()`, donde ya se calcula `prize` y `id` (solo si `prize.tier !== 'none'`):

```js
if (REGISTRY_WEBHOOK_URL) {
  const payload = buildRegistryPayload(id, score, total, prize);
  fetch(REGISTRY_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}
```

- `mode: 'no-cors'` evita el preflight CORS (Apps Script Web Apps no siempre exponen headers CORS completos); no necesitamos leer la respuesta.
- `.catch(() => {})`: cualquier error de red se descarta en silencio. No se usa `await` — no bloquea el render de resultados.
- Se envía una sola vez por partida completa (una sola llamada a `showResults()` por partida).

### `index.html` — orden de carga

Agregar `<script src="registry-config.js"></script>` después de `config.js` y antes de `game-logic.js`/`app.js`:

```
questions.js, config.js, registry-config.js, game-logic.js, assets.js, app.js
```

### Google Apps Script (vive en el Google Sheet del usuario, no en el repo)

Código completo a pegar en el editor de Apps Script del Sheet (`Extensiones → Apps Script`):

```js
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.timestamp,
    data.code,
    data.score,
    data.total,
    data.pct + '%',
    data.label || '',
    '' // Canjeado (se completa a mano)
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Guía de despliegue (paso a paso, para que Dante lo haga en su cuenta — no delegable):
1. Crear un Google Sheet nuevo. Primera fila con encabezados: `Fecha/Hora | Código | Puntaje | Total | % | Beca | Canjeado`.
2. `Extensiones → Apps Script`, pegar el código de arriba, guardar.
3. `Implementar → Nueva implementación → tipo "Aplicación web"`. Ejecutar como "Yo"; acceso "Cualquier usuario".
4. Autorizar permisos (pantalla de consentimiento de Google — la hace Dante, no Claude).
5. Copiar la URL de la Web App resultante y pasársela a Claude para pegarla en `registry-config.js`.

## Sheet schema (columnas)

| Fecha/Hora | Código | Puntaje | Total | % | Beca | Canjeado |
|---|---|---|---|---|---|---|
| ISO timestamp | CDM-XXXX-XXXX | ej. 8 | ej. 10 | ej. 80% | BECA DEL 50% | (vacío, se marca a mano) |

## Error handling

- `REGISTRY_WEBHOOK_URL` vacío → no se intenta ningún `fetch`, cero cambio de comportamiento respecto al sitio actual.
- Cualquier fallo de `fetch` (red, bloqueador de contenido, Apps Script caído) se descarta silenciosamente vía `.catch(() => {})`. Nunca se muestra error al jugador ni se retrasa la pantalla de resultados.
- No hay reintentos ni cola offline — está fuera de alcance (best-effort, volumen bajo esperado).

## Testing

- `buildRegistryPayload` se testea con Node (`tests/game-logic.test.js`), igual que el resto de funciones puras de `game-logic.js`: shape del objeto devuelto, valores correctos para distintos `score/total/prizeTier`.
- El `fetch()` en `app.js` es DOM/red, no testeable con Node — se verifica manualmente (jugar una partida ganadora con `REGISTRY_WEBHOOK_URL` apuntando a un Apps Script real de prueba, confirmar que aparece la fila en el Sheet).
- No se agrega ningún test que dependa de red real en el suite automatizado.

## Manual de uso (entregable separado, sin diseño adicional)

Documento nuevo, `MANUAL.md` en la raíz del proyecto (junto a `index.html`), cubriendo:
1. Cómo juega un usuario final (splash → inicio → preguntas → resultados → becas).
2. Cómo administra Dante las preguntas/ejes con `admin.html` (generar y cargar `config.js`).
3. Cómo configurar y leer el registro de becas en Google Sheets (incluye los pasos de despliegue del Apps Script de este spec).
4. Cómo publicar/actualizar el sitio (archivos a subir, cuáles NO subir — `admin.html` es de uso local).

## Assumptions

- Volumen de becas emitidas es bajo (uso educativo/comunitario), por lo que Google Sheets + Apps Script sin colas ni reintentos es suficiente.
- Dante tiene o puede crear una cuenta de Google Sheets propia (confirmado en la conversación).
- No se requiere deduplicar códigos entre partidas — cada partida completa que gana una beca genera una fila nueva, incluso si es la misma persona jugando de nuevo.
