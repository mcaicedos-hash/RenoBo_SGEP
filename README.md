# Encuesta · Diagnóstico de Clima Organizacional · SGEP / RenoBo

Aplicación web estática (HTML, CSS y JavaScript vanilla) para aplicar la
encuesta diagnóstica de clima organizacional definida en el Compromiso 4 —
Gestión Cultural de la Subgerencia de Ejecución de Proyectos.

La interfaz es tipo presentación, con navegación pregunta por pregunta,
componentes variados (escala Likert, preguntas abiertas, mapeo de actores)
y registro centralizado en Google Sheets a través de un endpoint Google
Apps Script.

---

## Estructura de archivos

```
encuesta-renobo/
├── index.html              · Aplicación principal (todas las "slides")
├── styles.css              · Hoja de estilos (kit de marca RenoBo)
├── app.js                  · Lógica: navegación, estado, validación, envío
├── google-apps-script.gs   · Código del backend (pegar en Apps Script)
└── README.md               · Este archivo
```

---

## Probar localmente

Como es un sitio estático, se puede abrir directamente:

```bash
# Opción 1 — abrir el archivo
open index.html        # macOS
xdg-open index.html    # Linux

# Opción 2 — servidor local (recomendado, evita restricciones del navegador)
python3 -m http.server 5500
# luego abrir http://localhost:5500
```

En modo desarrollo (sin endpoint configurado), el envío se simula localmente
y los datos del payload se imprimen en la consola del navegador.

---

## Desplegar el backend (Google Sheets + Apps Script)

1. **Crear la hoja.** Vaya a [sheets.new](https://sheets.new) y cree una hoja
   nueva. Llámela algo como “Diagnóstico Clima SGEP — Respuestas”.
2. **Copiar el ID de la hoja.** En la URL aparece algo como:
   ```
   https://docs.google.com/spreadsheets/d/AAAA...BBBB/edit
                                          ↑ este es el ID ↑
   ```
3. **Abrir Apps Script.** En la hoja, vaya a **Extensiones → Apps Script**.
4. **Pegar el script.** Borre el código de ejemplo y pegue todo el contenido
   de `google-apps-script.gs`.
5. **Configurar el ID.** Reemplace `'PEGAR_AQUI_EL_ID_DE_LA_HOJA'` con el ID
   que copió antes.
6. **Guardar** y asignar un nombre al proyecto.
7. **Implementar.** Clic en **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**.
   - Descripción: “Endpoint encuesta v1”.
   - Ejecutar como: **yo mismo**.
   - Quién tiene acceso: **Cualquier usuario** (es indispensable para que la
     encuesta pueda enviar datos sin pedir login).
8. **Autorizar** los permisos cuando los pida.
9. **Copiar la URL** de implementación (termina en `/exec`).

---

## Conectar el frontend al backend

Abra `app.js` y reemplace:

```js
const ENDPOINT_URL = '';
```

por su URL de Apps Script:

```js
const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
```

Liste para enviar respuestas reales.

---

## Desplegar en Netlify

### Opción A — Drag & Drop (más rápido)

1. Comprima la carpeta `encuesta-renobo` en un `.zip` (o solo la carpeta).
2. Vaya a [app.netlify.com/drop](https://app.netlify.com/drop).
3. Arrastre la carpeta. Netlify le asigna una URL pública con HTTPS.

### Opción B — Desde GitHub (recomendado para iteraciones)

1. Suba el directorio a un repositorio nuevo en GitHub.
2. En Netlify, **Add new site → Import an existing project → GitHub**.
3. Seleccione el repo. Sin pasos de build (es estático).
4. Cada push al repo despliega automáticamente.

---

## Lectura de los resultados

La hoja de cálculo se llena fila a fila. Columnas principales:

| Columna     | Contenido                                                |
|-------------|----------------------------------------------------------|
| submissionId| Identificador único del envío (`RB-XXXX-YYYY`).          |
| timestamp   | Fecha/hora ISO 8601.                                     |
| group       | ID interno del grupo de trabajo.                         |
| groupName   | Nombre legible del grupo.                                |
| q1, q5, q6, q10, q14, q15 | Respuestas abiertas (texto libre).         |
| q2, q3, q4, q7, q8, q11, q12, q13 | Escala Likert 1–4.                 |
| q9_json     | Lista de actores con problemas represados, en JSON.      |

**Para análisis en Excel:** desde la hoja de Google Sheets, **Archivo →
Descargar → Microsoft Excel (.xlsx)**. O conecte una consulta Power Query
apuntando a la URL de publicación de la hoja para sincronización automática.

---

## Detalles del cuestionario

La encuesta sigue exactamente la estructura definida en la metodología:

**Bloque 1 — Liderazgo de Negocio**
- P1 (abierta) · cliente y entrega del proyecto
- P2, P3, P4 (Likert) · presupuesto, fases de maduración, cadena de valor
- P5 (abierta) · aprendizajes no planeados

**Bloque 2 — Liderazgo Servicial**
- P6 (abierta) · proceso de manejo de impedimentos
- P7, P8 (Likert) · información a tiempo, consistencia de directrices
- P9 (mapeo) · actores con gestiones represadas (entrada multi-fila)
- P10 (abierta) · ambiente de trabajo del grupo

**Bloque 3 — Liderazgo Técnico**
- P11, P12, P13 (Likert) · herramientas, competencias, estándares
- P14 (abierta) · recurso o conocimiento faltante
- P15 (abierta) · perfil profesional que sumaría

La escala Likert es de **4 puntos** (sin punto medio neutro), forzando una
posición y permitiendo el cálculo de promedios que se ubican en las cuatro
franjas definidas en el §3.2 de la metodología (Crítico / Alerta / Aceptable
/ Fortaleza).

---

## Identidad visual aplicada

La aplicación replica las reglas del kit de marca RenoBo descritas en el
prompt de presentaciones:

- **Color de acento único:** Verde Renovación `#AFE951`.
- **Tipografía:** IBM Plex Sans en pesos ExtraLight, Light, Regular, Medium.
- **Esquina superior derecha vacía** en todas las pantallas.
- **Pills sólidas, círculos sólidos, bullets circulares, highlights inline.**
- **Sin franjas decorativas, sin bordes de color en cards, sin líneas bajo
  títulos.**
- **Alternancia rítmica** de fondos claros y oscuros (`#163738`,
  `#2A2A2A`).
- **Tarjetas con esquinas redondeadas (15–20px)** y fondo plano sólido.
- **Espacios en blanco generosos** (≥30% del slide).

---

## Persistencia local

El estado de la encuesta se guarda automáticamente en `localStorage` del
navegador, por lo que si el encuestado cierra la pestaña por error puede
recuperar lo escrito al reabrir. Una vez enviado, el almacenamiento local
se limpia.

---

## Personalización rápida

| Quiere cambiar...                       | Edite...                              |
|-----------------------------------------|---------------------------------------|
| El color de acento                      | `:root --acento` en `styles.css`     |
| La lista de grupos de trabajo           | `GROUPS` en `app.js`                 |
| Las etiquetas de la escala Likert       | `LIKERT` en `app.js`                 |
| El texto de una pregunta                | El `<h2>` de la `.slide` en HTML     |
| Agregar/quitar preguntas                | HTML + array `slidesOrder` en JS     |
