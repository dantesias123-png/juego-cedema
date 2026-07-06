# Trivia CEDEMA — Split en archivos estáticos + panel de administrador

## Contexto

La trivia existe hoy como un único archivo HTML autocontenido (estructura, estilos, banco de
100 preguntas y lógica de juego, todo inline). El objetivo es:

1. Separarlo en un proyecto estático de varios archivos, editable con comodidad.
2. Agregar un panel de administrador local que permita configurar qué preguntas/ejes están
   disponibles, sin necesidad de tocar código ni backend.

No hay backend ni base de datos: todo sigue siendo HTML/JS servido como archivos estáticos.

## Estructura de archivos

Sin build step, sin módulos ES (`import`/`export` nativos) — scripts globales clásicos, para que
`admin.html` funcione abierto con doble clic (`file://`) sin problemas de CORS.

- **`questions.js`** — banco de preguntas completo, sin lógica:
  ```js
  const questionBank = {
    "Europa y América Latina": [ { q, options, correct }, ... ],
    ...
  };
  ```
- **`config.js`** — generado por `admin.html`, define qué está deshabilitado:
  ```js
  const gameConfig = {
    disabledAxes: ["La República Italiana"],
    disabledQuestions: {
      "Europa y América Latina": [2, 5],
      "República Popular China": [0]
    }
  };
  ```
  Se sube al hosting junto a los demás archivos. Si no existe, o define un objeto vacío
  (`{ disabledAxes: [], disabledQuestions: {} }`), el juego usa todo el banco habilitado — el
  sitio se publica por defecto con un `config.js` "todo habilitado" de fábrica y nunca depende
  de que exista un archivo personalizado.
- **`app.js`** — toda la lógica de juego: transiciones de pantalla, construcción de la partida,
  manejo de respuestas, resultados y premios.
- **`index.html`** — estructura + estilos (el `<style>` se mantiene igual que en el original).
  Al final carga en orden: `questions.js`, `config.js`, `app.js`.
- **`admin.html`** — herramienta standalone de uso local para el administrador. **No se sube al
  hosting público.** Carga `questions.js` (para listar preguntas reales) y tiene su propio script
  inline para armar, importar y exportar `config.js`.

## Cómo agregar preguntas a futuro (regla operativa)

El usuario avisará en el chat cuando quiera modificar el banco de preguntas.

- **Agregar preguntas a un eje existente**: agregar objetos al **final** del array de ese eje en
  `questions.js`. Seguro — como `config.js` solo lista índices deshabilitados, las preguntas
  nuevas quedan habilitadas automáticamente.
- **Agregar un eje nuevo**: agregar una clave nueva a `questionBank`. Automático — al no estar en
  `disabledAxes`, entra activo y el largo de la partida sube en 1 sin tocar el panel.
- **Evitar**: insertar en el medio de un array existente, reordenar o borrar preguntas ya
  existentes — correría los índices y podría des-sincronizar lo que estaba marcado como
  deshabilitado en un `config.js` ya publicado. Si hace falta reordenar, reabrir `admin.html`,
  revisar los checkboxes contra el estado nuevo, y re-exportar.

## Lógica de armado del juego (`app.js`)

`buildGame()`:

1. Ejes candidatos = claves de `questionBank` menos las listadas en `gameConfig.disabledAxes`.
2. Salvaguarda: si eso deja 0 ejes (config mal armado o corrupto), usar todos los ejes de
   `questionBank` igual, con un `console.warn`. El juego nunca debe quedar en 0 preguntas.
3. Por cada eje candidato: filtrar del pool de preguntas de ese eje los índices listados en
   `gameConfig.disabledQuestions[eje]`, y sortear 1 pregunta de las que queden.
   - Si un eje se queda sin preguntas disponibles (todas deshabilitadas), se excluye de la
     partida con un `console.warn`, y el largo de esa partida baja en 1 (no se reemplaza por otra
     pregunta de otro eje).
4. El largo final de la partida = cantidad de ejes que efectivamente aportaron una pregunta. Ya
   no es un `10` fijo.
5. El orden de presentación de los ejes elegidos se sigue barajando al azar (sin cambios respecto
   al comportamiento actual).

### Generalización de lo que hoy asume "10 preguntas fijas"

- Contador "Pregunta X de N" y barra de progreso → usan `gameQuestions.length` en vez de `10`.
- Textos de la pantalla de inicio ("N en total", "1 por eje") → se calculan dinámicamente al
  cargar la página, contando ejes/preguntas efectivamente habilitados según `questionBank` +
  `gameConfig` (sin necesidad de jugar una partida).
- Premios: en vez del objeto de mensajes indexado 0–10, se usan 5 franjas por **porcentaje** de
  aciertos sobre el total de la partida (mismas 5 categorías de mensaje que ya existían:
  bajo, en desarrollo, bueno, muy bueno, excelente/perfecto).
  - Cortes de beca fijos en el código (no editables desde el panel):
    - `< 60%` → sin premio
    - `60%–79%` → beca 25%
    - `80%–99%` → beca 50%
    - `100%` → beca completa

## Panel de administrador (`admin.html`)

### UI

- Un bloque colapsable por cada eje temático:
  - Checkbox de eje ("Eje habilitado") en el encabezado del bloque.
  - Lista de sus preguntas (según `questions.js`), cada una con checkbox + texto de la pregunta
    truncado, para poder identificarla sin ambigüedad.
  - Botones "Marcar todas / Desmarcar todas" dentro de cada bloque de eje (necesario dado el
    volumen: ~10 checkboxes de pregunta por eje, ~100 en total).
- Resumen en vivo en la parte superior: "Juego resultante: **N** preguntas (ejes activos: lista)".
  Se recalcula ante cualquier cambio de checkbox, antes de exportar.
- Botón **"Cargar configuración existente"**: `<input type="file">` que lee un `config.js` ya
  existente (vía `FileReader` + inyección de `<script>` temporal para evaluarlo y leer la
  constante `gameConfig`), y precarga todos los checkboxes según ese contenido.
- Botón **"Generar y descargar config.js"**: serializa el estado actual de los checkboxes al
  esquema de `gameConfig` y dispara la descarga del archivo (`Blob` + link temporal), listo para
  subir al hosting reemplazando el anterior.

### Manejo de errores y casos borde

- `config.js` ausente en el hosting público → `app.js` usa `{ disabledAxes: [], disabledQuestions: {} }`
  (todo habilitado). El sitio nunca depende de la existencia del archivo.
- `config.js` corrupto o mal formado al cargarlo en `admin.html` → mensaje de error visible en el
  panel (no rompe la página del panel).
- Eje o índice de pregunta referenciado en `config.js` que ya no existe en `questions.js`
  (por edición manual posterior) → se ignora silenciosamente esa entrada al construir el juego.
- Salvaguarda: el juego nunca queda con 0 preguntas (ver punto 2 de `buildGame()`).

## Testing (manual — sitio estático sin backend, no hay suite automatizada)

- Abrir `index.html` con el `config.js` "todo habilitado" de fábrica → debe jugarse igual que la
  versión original (10 preguntas, 1 por eje).
- Generar un `config.js` desde `admin.html` deshabilitando 2–3 ejes completos y algunas preguntas
  puntuales de otros ejes → subir y verificar que el juego respeta esas exclusiones, y que el
  contador, la barra de progreso y los premios se recalculan correctamente para el nuevo largo.
- Cargar un `config.js` existente en `admin.html` y confirmar que los checkboxes reflejan
  correctamente lo guardado.
- Caso límite: deshabilitar todas las preguntas de un eje (pero dejar el eje habilitado) →
  confirmar que ese eje se salta sin romper el juego y que el largo baja en 1.
- Caso límite: deshabilitar todos los ejes → confirmar que la salvaguarda activa todos los ejes
  igual (con warning en consola) en vez de romper el juego.

## Fuera de alcance (explícitamente descartado en esta iteración)

- Backend/base de datos para persistir configuración remota (se eligió archivo exportable).
- Autenticación o protección de acceso a `admin.html` (se usa solo localmente, no se publica).
- Edición de texto/opciones de preguntas desde el panel admin (eso se sigue haciendo editando
  `questions.js` directamente, a pedido del usuario vía chat).
- Umbrales de premio editables desde el panel (quedan fijos en `app.js`).
- Largo de juego configurable de forma independiente a los ejes habilitados (el largo es
  siempre = cantidad de ejes habilitados que aportan pregunta).
