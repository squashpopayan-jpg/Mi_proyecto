# Detector de Mano

App web (instalable en el celular) que usa la cámara para seguir cada dedo de la mano
con MediaPipe Hand Landmarker y reconocer gestos (puño, mano abierta, paz, OK, pulgar arriba…)
y movimientos de deslizamiento (izquierda, derecha, arriba, abajo).

## Probar
La cámara del navegador requiere HTTPS. Activa GitHub Pages (Settings → Pages → rama del proyecto)
y abre la URL en el celular. Luego "Agregar a pantalla de inicio" para usarla como app.

En la computadora: `python3 -m http.server` y abre http://localhost:8000

## Modos
- **Gestos**: sigue cada dedo, reconoce gestos y deslizamientos.
- **Agarre**: analiza el agarre de la raqueta de squash (índice en gatillo, pulgar, dedos).
- **Señas** (`senas.js`): lecciones del alfabeto manual con % de acierto, grabación de señas
  propias, práctica de frases con calificación y voz, y traductor de señas a voz.
  Los datos se guardan solo en el navegador del celular.
