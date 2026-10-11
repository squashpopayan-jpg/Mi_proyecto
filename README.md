# Detector de Mano

App web (instalable en el celular) que usa la cámara para seguir cada dedo de la mano
con MediaPipe Hand Landmarker y reconocer gestos (puño, mano abierta, paz, OK, pulgar arriba…)
y movimientos de deslizamiento (izquierda, derecha, arriba, abajo).

## Probar
La cámara del navegador requiere HTTPS. Activa GitHub Pages (Settings → Pages → rama del proyecto)
y abre la URL en el celular. Luego "Agregar a pantalla de inicio" para usarla como app.

En la computadora: `python3 -m http.server` y abre http://localhost:8000
