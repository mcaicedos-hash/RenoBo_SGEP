/* ==========================================================================
   ENCUESTA · DIAGNÓSTICO DE CLIMA ORGANIZACIONAL · SGEP / RenoBo
   Lógica de la aplicación: navegación, estado, validación, envío.
   Sin frameworks. Vanilla JS.
   ========================================================================== */

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────
  // 0. CONFIGURACIÓN
  // ──────────────────────────────────────────────────────────────────────

  /**
   * URL del endpoint de Google Apps Script desplegado como Web App.
   * Reemplazar este valor por la URL real después de desplegar el script.
   * Si queda vacía, el envío hará una simulación local (modo desarrollo).
   */
  const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbxJXz39vWvM2-iVzGy1MydBLTnsjflkWnPDWbAy3RixnpsmUbffb99euSBdXt6E7JkDZQ/exec';
  // Ej: 'https://script.google.com/macros/s/AKfycbx.../exec'

  const STORAGE_KEY = 'renobo_clima_v1';

  /** Definición de los 10 grupos de trabajo de la SGEP. */
  const GROUPS = [
    { id: 'SED_1',   name: 'Equipo SED 1 y Salud',                type: 'Apoyo a la supervisión' },
    { id: 'URB_VIV',   name: 'Equipo Urbanismos y Vivienda',                 type: 'Apoyo a la supervisión' },
    { id: 'DISTRI', name: 'Equipo Universidad Distrital',                    type: 'Apoyo a la supervisión'},
    { id: 'UAESP', name: 'Equipo UAESP',                    type: 'Apoyo a la supervisión'},
    { id: 'SED_2',   name: 'Equipo SED 2',        type: 'Apoyo a la supervisión' },
    { id: 'CHSJD',    name: 'Equipo CH San Juan de Dios',                 type: 'Apoyo a la supervisión' },
    { id: 'BDC',  name: 'Equipo Bronx Distrito Creativo',              type: 'Apoyo a la supervisión' },
    { id: 'NOD_CUL',  name: 'Equipo Nodos y Cultura',                 type: 'Apoyo a la supervisión' },
    { id: 'TEC',  name: 'Equipo Técnico Transversal',          type: 'Equipo transversal' },
    { id: 'JUR', name: 'Equipo Jurídico Transversal',         type: 'Equipo transversal' },
    { id: 'SEG',   name: 'Equipo de Seguimiento Transversal',   type: 'Equipo transversal' }
  ];

  /** Etiquetas de la escala Likert (4 puntos, sin punto medio neutro). */
  const LIKERT = [
    { value: 1, label: 'Totalmente en desacuerdo' },
    { value: 2, label: 'En desacuerdo' },
    { value: 3, label: 'De acuerdo' },
    { value: 4, label: 'Totalmente de acuerdo' }
  ];

  /** Etiquetas humanas para el resumen final. */
  const QUESTION_LABELS = {
    q1:  'P1 · Cliente y entrega',
    q2:  'P2 · Presupuesto',
    q3:  'P3 · Fases de maduración',
    q4:  'P4 · Cadena de valor',
    q5:  'P5 · Aprendizajes',
    q6:  'P6 · Manejo de impedimentos',
    q7:  'P7 · Información a tiempo',
    q8:  'P8 · Consistencia de directrices',
    q9:  'P9 · Mapa de actores',
    q10: 'P10 · Ambiente del grupo',
    q11: 'P11 · Herramientas tecnológicas',
    q12: 'P12 · Competencias técnicas',
    q13: 'P13 · Estándares de calidad',
    q14: 'P14 · Recurso faltante',
    q15: 'P15 · Perfil que sumaría'
  };

  // ──────────────────────────────────────────────────────────────────────
  // 1. ESTADO
  // ──────────────────────────────────────────────────────────────────────

  /** Estado de respuestas. P9 es un arreglo de objetos. */
  const state = {
    group: null,
    q1: '', q2: null, q3: null, q4: null, q5: '',
    q6: '', q7: null, q8: null, q9: [], q10: '',
    q11: null, q12: null, q13: null, q14: '', q15: ''
  };

  /** Slides en orden de navegación. */
  const slidesOrder = [
    'cover', 'context', 'group',
    'intro-1', 'q1', 'q2', 'q3', 'q4', 'q5',
    'intro-2', 'q6', 'q7', 'q8', 'q9', 'q10',
    'intro-3', 'q11', 'q12', 'q13', 'q14', 'q15',
    'review', 'thanks'
  ];

  let currentIndex = 0;

  // ──────────────────────────────────────────────────────────────────────
  // 2. UTILIDADES
  // ──────────────────────────────────────────────────────────────────────

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function getSlide (key) { return $(`.slide[data-slide="${key}"]`); }

  function saveLocal () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, currentIndex }));
    } catch (_) { /* noop */ }
  }

  function loadLocal () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state) Object.assign(state, parsed.state);
      // No restauramos currentIndex automáticamente para no saltarse la portada;
      // pero sí podemos usarlo si quisiéramos en una versión futura.
    } catch (_) { /* noop */ }
  }

  function clearLocal () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function uid () {
    // Identificador corto tipo "RB-XXXX-YYYY"
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `RB-${a}-${b}`;
  }

  function showToast (msg, ms = 3000) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('is-visible'), ms);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. NAVEGACIÓN ENTRE SLIDES
  // ──────────────────────────────────────────────────────────────────────

  function showSlide (index) {
    if (index < 0 || index >= slidesOrder.length) return;

    // Validación antes de avanzar
    if (index > currentIndex) {
      const ok = validateSlide(slidesOrder[currentIndex]);
      if (!ok) return;
    }

    const prevSlide = $('.slide.is-active');
    if (prevSlide) {
      prevSlide.classList.remove('is-active', 'is-entering');
    }

    currentIndex = index;
    const target = getSlide(slidesOrder[index]);
    if (!target) return;

    target.classList.add('is-active');
    requestAnimationFrame(() => target.classList.add('is-entering'));

    // Si entramos al review, regenerarlo
    if (slidesOrder[index] === 'review') renderReview();
    // Si llegamos a thanks, asignar identificador (si aún no)
    if (slidesOrder[index] === 'thanks' && $('#submissionId').textContent === '—') {
      $('#submissionId').textContent = uid();
    }

    updateProgress();
    window.scrollTo({ top: 0, behavior: 'instant' });
    saveLocal();
  }

  function next () { showSlide(currentIndex + 1); }
  function prev () { showSlide(currentIndex - 1); }

  function goToSlide (key) {
    const idx = slidesOrder.indexOf(key);
    if (idx >= 0) showSlide(idx);
  }

  function updateProgress () {
    const pct = (currentIndex / (slidesOrder.length - 1)) * 100;
    $('#progressBar').style.width = pct + '%';
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. VALIDACIÓN
  // ──────────────────────────────────────────────────────────────────────

  function validateSlide (key) {
    if (key === 'group' && !state.group) {
      showToast('Por favor seleccione su grupo de trabajo antes de continuar.');
      return false;
    }
    // Las preguntas son opcionales individualmente — el review final muestra cuáles
    // quedaron en blanco para que el usuario decida si retroceder. Esto evita
    // bloquear a quien sinceramente no tiene una respuesta para alguna pregunta abierta.
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5. RENDER · GRUPOS DE TRABAJO
  // ──────────────────────────────────────────────────────────────────────

  function renderGroups () {
    const wrap = $('#groupCards');
    wrap.innerHTML = '';
    GROUPS.forEach(g => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', state.group === g.id ? 'true' : 'false');
      btn.dataset.groupId = g.id;
      if (state.group === g.id) btn.classList.add('is-selected');

      btn.innerHTML = `
        <div class="card__lead">
          <span class="card__check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <div>
            <div class="card__name">${g.name}</div>
            <div class="card__type">${g.type}</div>
          </div>
        </div>
      `;

      btn.addEventListener('click', () => {
        state.group = g.id;
        $$('.card', wrap).forEach(c => {
          c.classList.toggle('is-selected', c.dataset.groupId === g.id);
          c.setAttribute('aria-checked', c.dataset.groupId === g.id ? 'true' : 'false');
        });
        saveLocal();
      });

      wrap.appendChild(btn);
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6. RENDER · ESCALAS LIKERT
  // ──────────────────────────────────────────────────────────────────────

  function renderLikertScales () {
    $$('.slide[data-qtype="likert"]').forEach(slide => {
      const qid = slide.dataset.qid;
      const wrap = $('.likert', slide);
      wrap.innerHTML = '';
      LIKERT.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'likert__btn';
        btn.dataset.value = opt.value;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', state[qid] === opt.value ? 'true' : 'false');
        if (state[qid] === opt.value) btn.classList.add('is-selected');
        btn.innerHTML = `
          <span class="likert__num">${opt.value}</span>
          <span class="likert__label">${opt.label}</span>
        `;
        btn.addEventListener('click', () => {
          state[qid] = opt.value;
          $$('.likert__btn', wrap).forEach(b => {
            const v = parseInt(b.dataset.value, 10);
            b.classList.toggle('is-selected', v === opt.value);
            b.setAttribute('aria-checked', v === opt.value ? 'true' : 'false');
          });
          saveLocal();
          // UX fluido: avanzar automáticamente tras 380ms
          setTimeout(() => next(), 380);
        });
        wrap.appendChild(btn);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 7. RENDER · TEXTAREAS (preguntas abiertas)
  // ──────────────────────────────────────────────────────────────────────

  function bindTextareas () {
    $$('.slide[data-qtype="open"]').forEach(slide => {
      const qid = slide.dataset.qid;
      const ta = $('textarea', slide);
      const counter = $(`[data-counter="${qid}"]`, slide);
      // Restaurar valor previo
      if (state[qid]) ta.value = state[qid];
      counter.textContent = ta.value.length;

      ta.addEventListener('input', () => {
        state[qid] = ta.value;
        counter.textContent = ta.value.length;
        saveLocal();
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 8. P9 · MAPA DE ACTORES (filas dinámicas)
  // ──────────────────────────────────────────────────────────────────────

  function renderActors () {
    const wrap = $('#actorsList');
    wrap.innerHTML = '';

    if (state.q9.length === 0) {
      // Crear una fila vacía inicial
      state.q9.push({ scope: 'interna', name: '', issue: '', since: '' });
    }

    state.q9.forEach((actor, idx) => {
      const row = document.createElement('div');
      row.className = 'actor';
      row.innerHTML = `
        <div class="actor__field actor__field--type">
          <label class="actor__label">Tipo</label>
          <select class="actor__select" data-field="scope">
            <option value="interna" ${actor.scope === 'interna' ? 'selected' : ''}>Área interna RenoBo</option>
            <option value="externa" ${actor.scope === 'externa' ? 'selected' : ''}>Entidad externa</option>
          </select>
        </div>
        <div class="actor__field actor__field--name">
          <label class="actor__label">Nombre</label>
          <input class="actor__input" type="text" data-field="name" value="${escapeAttr(actor.name)}" placeholder="Ej. Subgerencia Jurídica, IDU, Catastro..." />
        </div>
        <div class="actor__field actor__field--issue">
          <label class="actor__label">Qué está pendiente</label>
          <input class="actor__input" type="text" data-field="issue" value="${escapeAttr(actor.issue)}" placeholder="Ej. concepto técnico de viabilidad" />
        </div>
        <div class="actor__field actor__field--since">
          <label class="actor__label">Desde</label>
          <input class="actor__input" type="text" data-field="since" value="${escapeAttr(actor.since)}" placeholder="Ej. mar/2025" />
        </div>
        <button type="button" class="actor__remove" aria-label="Eliminar actor" title="Eliminar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Bind a inputs
      $$('[data-field]', row).forEach(el => {
        el.addEventListener('input', () => {
          actor[el.dataset.field] = el.value;
          saveLocal();
        });
        el.addEventListener('change', () => {
          actor[el.dataset.field] = el.value;
          saveLocal();
        });
      });

      // Bind a botón eliminar
      $('.actor__remove', row).addEventListener('click', () => {
        state.q9.splice(idx, 1);
        saveLocal();
        renderActors();
      });

      wrap.appendChild(row);
    });
  }

  function escapeAttr (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // ──────────────────────────────────────────────────────────────────────
  // 9. RENDER · PANTALLA DE REVISIÓN
  // ──────────────────────────────────────────────────────────────────────

  function renderReview () {
    const wrap = $('#reviewList');
    wrap.innerHTML = '';

    const groupName = state.group
      ? (GROUPS.find(g => g.id === state.group) || {}).name
      : null;

    addReviewRow(wrap, 'Grupo', groupName, 'group');

    Object.keys(QUESTION_LABELS).forEach(qid => {
      let val;
      if (qid === 'q9') {
        const actores = state.q9.filter(a => (a.name || '').trim());
        val = actores.length ? `${actores.length} actor(es) registrado(s)` : '';
      } else {
        val = state[qid];
      }
      addReviewRow(wrap, QUESTION_LABELS[qid], val, qid);
    });
  }

  function addReviewRow (wrap, label, val, slideKey) {
    const row = document.createElement('div');
    row.className = 'review__row';

    const empty = (val === null || val === undefined || val === '');
    const display = empty
      ? 'Sin responder'
      : (typeof val === 'number' ? `${val} — ${LIKERT.find(l => l.value === val).label}` : String(val));

    row.innerHTML = `
      <span class="review__id">${label}</span>
      <span class="review__val ${empty ? 'review__val--empty' : ''}">${escapeAttr(display)}</span>
      <button type="button" class="review__edit">Editar</button>
    `;
    $('.review__edit', row).addEventListener('click', () => goToSlide(slideKey));
    wrap.appendChild(row);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 10. ENVÍO
  // ──────────────────────────────────────────────────────────────────────

  function buildPayload () {
    const payload = {
      submissionId: uid(),
      timestamp: new Date().toISOString(),
      group: state.group,
      groupName: state.group ? (GROUPS.find(g => g.id === state.group) || {}).name : null,
      // Bloque 1
      q1: state.q1,
      q2: state.q2, q3: state.q3, q4: state.q4,
      q5: state.q5,
      // Bloque 2
      q6: state.q6,
      q7: state.q7, q8: state.q8,
      q9: state.q9.filter(a => (a.name || '').trim()),
      q10: state.q10,
      // Bloque 3
      q11: state.q11, q12: state.q12, q13: state.q13,
      q14: state.q14,
      q15: state.q15
    };
    return payload;
  }

  async function submit () {
    const btn = $('#submitBtn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Enviando...';

    const payload = buildPayload();

    try {
      if (!ENDPOINT_URL) {
        // Modo desarrollo: simular envío
        console.warn('[RenoBo] ENDPOINT_URL no configurado. Simulando envío. Payload:', payload);
        await new Promise(r => setTimeout(r, 800));
      } else {
        // Apps Script no acepta CORS preflight con application/json,
        // por eso usamos text/plain (Apps Script lo lee igual desde e.postData.contents)
        const res = await fetch(ENDPOINT_URL, {
          method: 'POST',
          mode: 'no-cors', // Apps Script Web App suele requerir esto
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        // En modo no-cors no podemos leer la respuesta, pero si no hubo error
        // de red asumimos éxito. Apps Script registra la fila en cualquier caso.
      }

      // Mostrar pantalla de gracias
      $('#submissionId').textContent = payload.submissionId;
      next();
      clearLocal();
    } catch (err) {
      console.error('[RenoBo] Error al enviar:', err);
      btn.disabled = false;
      btn.innerHTML = originalText;
      showToast('No se pudo enviar la respuesta. Verifique su conexión e intente nuevamente.');
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 11. EVENT LISTENERS GLOBALES
  // ──────────────────────────────────────────────────────────────────────

  function bindGlobal () {
    document.addEventListener('click', e => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'next') next();
      if (action === 'prev') prev();
    });

    $('#submitBtn').addEventListener('click', submit);

    $('#addActor').addEventListener('click', () => {
      state.q9.push({ scope: 'interna', name: '', issue: '', since: '' });
      saveLocal();
      renderActors();
      // Scroll al último elemento
      const list = $('#actorsList');
      const last = list.lastElementChild;
      if (last) last.querySelector('input').focus();
    });

    // Atajos de teclado: Enter en pantallas que no sean textareas avanza
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      const activeSlide = slidesOrder[currentIndex];
      if (activeSlide === 'thanks') return;
      e.preventDefault();
      next();
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 12. INIT
  // ──────────────────────────────────────────────────────────────────────

  function init () {
    loadLocal();
    renderGroups();
    renderLikertScales();
    bindTextareas();
    renderActors();
    bindGlobal();
    updateProgress();
    // Asegurar que la primera slide tenga la transición aplicada
    requestAnimationFrame(() => {
      const first = $('.slide.is-active');
      if (first) first.classList.add('is-entering');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
