/**
 * ============================================================================
 *  ENCUESTA · DIAGNÓSTICO DE CLIMA ORGANIZACIONAL · SGEP / RenoBo
 *  Backend Apps Script — recibe POST y registra en Google Sheets.
 * ============================================================================
 *
 *  CÓMO DESPLEGAR:
 *  1. Cree una hoja de Google Sheets nueva. Cópiela en su Drive.
 *  2. Abra el menú "Extensiones → Apps Script". Borre el código de ejemplo y
 *     pegue ESTE archivo completo.
 *  3. En la línea SHEET_ID de abajo, pegue el ID de su hoja (la parte de la URL
 *     que va entre /d/ y /edit).
 *  4. Guarde (Ctrl/Cmd+S). Asigne un nombre al proyecto (ej. "Encuesta RenoBo").
 *  5. Haga clic en "Implementar → Nueva implementación".
 *     - Tipo: "Aplicación web".
 *     - Ejecutar como: yo mismo (su correo).
 *     - Quién tiene acceso: "Cualquier usuario" (importante, sino la encuesta
 *       no podrá enviar datos).
 *  6. Autorice los permisos cuando los pida (es su propia hoja).
 *  7. Copie la URL de implementación (termina en /exec) y péguela en el
 *     archivo app.js, en la constante ENDPOINT_URL.
 *  8. Listo. Cada respuesta enviada quedará como una nueva fila en la hoja.
 *
 *  La hoja se inicializa con encabezados automáticamente la primera vez.
 * ============================================================================
 */

// ⬇⬇⬇ REEMPLACE ESTE VALOR POR EL ID DE SU HOJA DE GOOGLE SHEETS ⬇⬇⬇
const SHEET_ID = 'PEGAR_AQUI_EL_ID_DE_LA_HOJA';
// ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆ ⬆⬆⬆

const SHEET_NAME = 'Respuestas';

const HEADERS = [
  'submissionId', 'timestamp', 'group', 'groupName',
  'q1', 'q2', 'q3', 'q4', 'q5',
  'q6', 'q7', 'q8', 'q9_json', 'q10',
  'q11', 'q12', 'q13', 'q14', 'q15'
];

/**
 * Manejador POST. La encuesta envía un JSON como text/plain;
 * Apps Script lo lee desde e.postData.contents.
 */
function doPost (e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const data = JSON.parse(raw);

    const sheet = getOrCreateSheet_();

    // Construir fila respetando el orden de HEADERS
    const row = HEADERS.map(h => {
      if (h === 'q9_json') {
        return JSON.stringify(data.q9 || []);
      }
      const v = data[h];
      // Aceptar 0 y false como valores válidos
      return (v === null || v === undefined) ? '' : v;
    });

    sheet.appendRow(row);

    return _json({ ok: true, submissionId: data.submissionId });
  } catch (err) {
    console.error(err);
    return _json({ ok: false, error: String(err) });
  }
}

/**
 * Manejador GET — útil para verificar el despliegue desde el navegador.
 */
function doGet () {
  return _json({
    ok: true,
    service: 'Encuesta RenoBo',
    message: 'Endpoint activo. Use POST para enviar respuestas.'
  });
}

/**
 * Devuelve la hoja, creándola con encabezados si no existe.
 */
function getOrCreateSheet_ () {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#163738')
         .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Helper — devolver respuesta JSON.
 */
function _json (obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
