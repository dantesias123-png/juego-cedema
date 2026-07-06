# Manual de uso — Trivia CEDEMA

## 1. Qué es esto

Un sitio estático (sin backend) con una trivia de Relaciones Internacionales. Tiene tres partes:

- `index.html` — el juego público.
- `admin.html` — panel de administración **local** para elegir qué preguntas están activas. No debe publicarse en el hosting público.
- El registro de becas en Google Sheets (opcional, ver sección 4).

## 2. Cómo juega un usuario

1. **Splash**: pantalla de bienvenida con el logo — botón "JUGAR".
2. **Inicio**: explica reglas, escala de premios, y cuántas preguntas tiene la partida actual (depende de cuántos ejes temáticos estén habilitados — ver sección 3). Botón "Comenzar Trivia".
3. **Juego**: una pregunta por eje temático habilitado, en orden aleatorio, opción múltiple (A-D). Cada respuesta muestra si fue correcta y la respuesta correcta si falló, y avanza sola a los ~1.8s.
4. **Resultados**: puntaje final, mensaje según el % de aciertos, y si llegó al 60% o más, un código único (`CDM-XXXX-XXXX`) y el nivel de beca ganado:
   - 60–79% → Beca del 25%
   - 80–99% → Beca del 50%
   - 100% → Beca completa
   - Menos de 60% → sin premio, mensaje de aliento.
   - Nota: cada ganador ve el aviso legal "No aplica automáticamente a cursos o talleres organizados en colaboración con instituciones aliadas. Consultá términos y condiciones."
5. El código se canjea por Instagram de CEDEMA, en privado (el sitio no pide ni guarda datos personales).

## 3. Cómo administrar las preguntas (`admin.html`)

`admin.html` es **solo para uso local** — abrilo haciendo doble clic desde tu computadora (no necesita servidor) o sirviéndolo localmente. **No lo subas al hosting público** junto al resto del sitio.

1. Al abrirlo, ves los 10 ejes temáticos, todos habilitados por defecto, cada uno con sus 10 preguntas.
2. Desmarcá un eje entero para excluirlo completamente de las partidas.
3. Hacé clic en un eje para expandirlo y ver sus preguntas individuales; desmarcá las que no quieras usar. "Marcar todas" / "Desmarcar todas" lo hacen de una.
4. El recuadro superior ("Juego resultante: N preguntas...") se actualiza en vivo — ese N es exactamente cuántas preguntas tendrá cada partida (una por eje que quede con al menos una pregunta habilitada).
5. Cuando termines, clic en **"Generar y descargar config.js"** — se descarga un archivo `config.js`.
6. Reemplazá el `config.js` del sitio publicado por el que acabás de descargar. Los cambios aplican en el próximo `index.html` que se abra.
7. Para revisar o seguir editando una configuración ya guardada, usá **"Cargar configuración existente"** y seleccioná ese `config.js`.
8. Si el archivo que cargás está corrupto o no tiene el formato esperado, aparece un mensaje de error en rojo y la página no se rompe — simplemente no aplica los cambios.

## 4. Registro de becas emitidas (Google Sheets)

Por defecto el sitio **no** registra nada externamente — cada resultado vive solo en la pantalla del jugador. Para tener un registro central de todas las becas otorgadas, conectá el sitio a un Google Sheet propio:

### 4.1 Crear el Sheet y el Apps Script

1. Creá un Google Sheet nuevo. En la primera fila, agregá estos encabezados: `Fecha/Hora | Código | Puntaje | Total | % | Beca | Canjeado`.
2. Menú `Extensiones → Apps Script`.
3. Borrá el contenido del editor y pegá exactamente esto:

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

4. Guardá el proyecto (ícono de disquete, o Ctrl+S).

Nota: el sitio también envía `data.tier` (el nivel de beca en formato interno: `quarter`/`half`/`complete`), pero el script de arriba no lo escribe en ninguna columna a propósito — usa `data.label` (el texto legible) para la columna "Beca". `data.tier` queda disponible por si en el futuro querés filtrar o agrupar por nivel de forma más robusta que parseando el texto de `label`.

### 4.2 Publicarlo como Web App

1. Arriba a la derecha, `Implementar → Nueva implementación`.
2. Tipo: **Aplicación web**.
3. "Ejecutar como": tu cuenta (Yo). "Quién tiene acceso": **Cualquier usuario**.
4. Clic en "Implementar". Google va a pedirte autorizar permisos (es tu propia cuenta autorizando tu propio script — es seguro, hacelo).
5. Copiá la URL que te da ("URL de la aplicación web"). Termina en `/exec`.

### 4.3 Conectarlo al sitio

1. Abrí `registry-config.js` en el sitio.
2. Reemplazá la línea `const REGISTRY_WEBHOOK_URL = "";` por tu URL:
   ```js
   const REGISTRY_WEBHOOK_URL = "https://script.google.com/macros/s/TU_ID_AQUI/exec";
   ```
3. Volvé a publicar el sitio con ese archivo actualizado.

Desde ese momento, cada vez que alguien gane una beca (60% o más), se agrega automáticamente una fila al Sheet con el código, puntaje, porcentaje, nivel de beca y fecha/hora. La columna "Canjeado" queda vacía — marcala vos a mano cuando alguien canjee su código por Instagram.

Si el Sheet no está disponible por algún motivo (sin internet, script caído, etc.), el jugador nunca lo nota: su resultado y código se muestran igual, simplemente esa fila no llega al registro.

### 4.4 Privacidad de la URL

La URL de tu Web App no es una contraseña, pero cualquiera que la tenga puede escribir filas falsas en tu Sheet. Si tu repositorio del sitio es público, no subas tu URL real a `registry-config.js` en el repo — dejá el valor vacío ahí y completalo solo en la copia que efectivamente publicás.

## 5. Publicar el sitio

Archivos que SÍ van al hosting público: `index.html`, `app.js`, `questions.js`, `game-logic.js`, `assets.js`, `config.js`, `registry-config.js`.

Archivo que NO debe subirse al hosting público: `admin.html` (es una herramienta local para vos).
