// app.js

// Estado global (solo en RAM, no se persiste)
let exclusionsData = {};   // { nombre: [excluidos] }
let hasExclusions  = false;
let selectedBudget = null;
let currentExclPerson = null;
let dragSrcEl = null;

// ─────────────────────────────────────────
// NAVEGACIÓN DE PÁGINAS
// ─────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('page') === 'eventos') {
    document.getElementById('page-eventos').classList.remove('d-none');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('page') === 'eventos') {
    document.getElementById('page-eventos').classList.remove('d-none');
  }
});

function showPage(page) {
  document.getElementById('page-inicio').classList.add('d-none');
  document.getElementById('page-eventos').classList.add('d-none');
  document.getElementById('page-' + page).classList.remove('d-none');

  // Marcar nav link activo
  document.getElementById('nav-inicio').classList.remove('active');
  document.getElementById('nav-eventos').classList.remove('active');
  document.getElementById('nav-' + page).classList.add('active');

  if (page === 'eventos') showStep(1);
}

// ─────────────────────────────────────────
// STEPS
// ─────────────────────────────────────────
function showStep(n) {
  // Ocultar todos los steps (id que empieza con step-)
  document.querySelectorAll('[id^="step-"]').forEach(el => el.classList.add('d-none'));
  document.getElementById('step-' + n).classList.remove('d-none');
  window.scrollTo(0, 0);

  if (n === 2) buildParticipantsList();
  if (n === 3) buildExclusionsList();
  if (n === 4) setTimeout(initEventDragDrop, 50);
  if (n === 5) buildQuickDates();
}

function goStep(n) {
  if (!validateStep()) return;
  showStep(n);
}

function validateStep() {
  const visible = [...document.querySelectorAll('[id^="step-"]')].find(el => !el.classList.contains('d-none'));
  if (!visible) return true;

  if (visible.id === 'step-1') {
    if (!document.getElementById('input-organizador').value.trim()) {
      alert('Ingresa tu nombre para continuar.');
      return false;
    }
  }
  if (visible.id === 'step-2') {
    if (getParticipants().length < 2) {
      alert('Agrega al menos 2 participantes.');
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────
// STEP 2 – PARTICIPANTES + DRAG & DROP
// ─────────────────────────────────────────
function buildParticipantsList() {
  const container = document.getElementById('participants-list');
  // Guardar los nombres existentes para no perderlos al volver
  const existing = [...container.querySelectorAll('.participant-input')].map(i => i.value);
  container.innerHTML = '';

  const organizer = document.getElementById('input-organizador').value.trim();
  const incluye   = document.getElementById('check-incluir').checked;

  // Fila del organizador (no eliminable, no draggable)
  if (incluye) {
    container.appendChild(createRow(organizer, true));
  }

  // Restaurar participantes existentes o poner 2 vacíos por defecto
  const others = existing.filter(v => v && v !== organizer);
  const toAdd  = others.length > 0 ? others : ['', ''];
  toAdd.forEach(v => container.appendChild(createRow(v, false)));
}

function createRow(value, fixed) {
  const row = document.createElement('div');
  row.className = 'participant-row';

  if (!fixed) {
    row.draggable = true;
    row.ondragstart = e => { dragSrcEl = row; e.dataTransfer.effectAllowed = 'move'; };
    row.ondragover  = e => { e.preventDefault(); row.classList.add('drag-over'); };
    row.ondragleave = ()  => row.classList.remove('drag-over');
    row.ondrop = e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (dragSrcEl && dragSrcEl !== row) {
        const container = document.getElementById('participants-list');
        const rows = [...container.children];
        const srcI  = rows.indexOf(dragSrcEl);
        const destI = rows.indexOf(row);
        if (srcI < destI) container.insertBefore(dragSrcEl, row.nextSibling);
        else              container.insertBefore(dragSrcEl, row);
      }
    };
  }

  row.innerHTML = `
    <span class="drag-handle">${fixed ? '👤' : '⠿'}</span>
    <input type="text" class="form-control participant-input"
           value="${value}" placeholder="Nombre del participante"
           ${fixed ? 'readonly' : ''}/>
    ${!fixed ? '<button class="btn btn-outline-danger btn-sm" onclick="this.closest(\'.participant-row\').remove()">✕</button>' : ''}
  `;
  return row;
}

function addParticipant() {
  const container = document.getElementById('participants-list');
  const row = createRow('', false);
  container.appendChild(row);
  row.querySelector('input').focus();
}

function getParticipants() {
  return [...document.querySelectorAll('.participant-input')]
    .map(i => i.value.trim())
    .filter(v => v !== '');
}

// ─────────────────────────────────────────
// STEP 3 – EXCLUSIONES
// ─────────────────────────────────────────
function toggleExclusion(yes) {
  hasExclusions = yes;
  document.getElementById('btn-no-excl').className = yes ? 'btn btn-outline-primary flex-fill' : 'btn btn-primary flex-fill';
  document.getElementById('btn-si-excl').className = yes ? 'btn btn-primary flex-fill'         : 'btn btn-outline-primary flex-fill';
  document.getElementById('exclusions-panel').classList.toggle('d-none', !yes);
  if (yes) buildExclusionsList();
}

function buildExclusionsList() {
  const list = document.getElementById('exclusions-list');
  list.innerHTML = '';
  getParticipants().forEach(name => {
    const excl = exclusionsData[name] || [];
    const row  = document.createElement('div');
    row.className = 'excl-row';
    row.onclick = () => openExclModal(name);
    row.innerHTML = `
      <span><strong>${name}</strong>${excl.length ? ': <span class="text-danger">≠ ' + excl.join(', ') + '</span>' : ''}</span>
      <span>›</span>
    `;
    list.appendChild(row);
  });
}

function openExclModal(person) {
  currentExclPerson = person;
  document.getElementById('excl-modal-title').textContent = person;
  const list    = document.getElementById('excl-modal-list');
  const current = exclusionsData[person] || [];
  list.innerHTML = '';
  getParticipants().filter(p => p !== person).forEach(p => {
    const label = document.createElement('label');
    label.className = 'd-flex align-items-center gap-2 mb-2';
    label.innerHTML = `<input type="checkbox" class="form-check-input" value="${p}" ${current.includes(p) ? 'checked' : ''}/> ${p}`;
    list.appendChild(label);
  });
  document.getElementById('excl-overlay').classList.remove('d-none');
}

function closeExclModal() {
  document.getElementById('excl-overlay').classList.add('d-none');
}

function saveExclusion() {
  exclusionsData[currentExclPerson] = [...document.querySelectorAll('#excl-modal-list input:checked')].map(c => c.value);
  closeExclModal();
  if (hasExclusions) buildExclusionsList();
}

// ─────────────────────────────────────────
// STEP 4 – TIPO DE EVENTO
// ─────────────────────────────────────────
function selectEvent(btn, type) {
  document.querySelectorAll('#step-4 .btn').forEach(b => b.classList.remove('active', 'btn-primary'));
  btn.classList.add('active', 'btn-primary');
  document.getElementById('input-evento').value = type;
}

// ─────────────────────────────────────────
// STEP 5 – FECHA
// ─────────────────────────────────────────

const EVENT_SUGGESTIONS = {
  navidad:  [
    { month: 11, day: 24, label: '🎄 Noche Buena'               },
    { month: 11, day: 25, label: '🎁 Navidad'                   },
    { month: 11, day: 20, label: '🎅 Posada previa a Navidad'   },
  ],
  valentin: [
    { month:  1, day: 14, label: '💝 Día de San Valentín'       },
    { month:  1, day: 13, label: '💌 Víspera de San Valentín'   },
    { month:  1, day:  8, label: '🌹 Fin de semana romántico'   },
  ],
  nino: [
    { month:  3, day: 30, label: '🧸 Día del Niño'              },
    { month:  3, day: 29, label: '🎠 Víspera Día del Niño'      },
    { month:  3, day: 27, label: '🎈 Festejo del fin de semana' },
  ],
  madre: [
    { month:  4, day: 10, label: '🌸 Día de la Madre'           },
    { month:  4, day:  9, label: '💐 Festejo previo'            },
    { month:  4, day:  4, label: '🌷 Fin de semana especial'    },
  ],
};

const EVENT_KEYWORDS = {
  navidad:  ['navidad'],
  valentin: ['valentín','valentin','san val'],
  nino:     ['niño','nino'],
  madre:    ['madre'],
};

function getEventKey(name) {
  const lower = name.toLowerCase();
  return Object.keys(EVENT_KEYWORDS).find(k =>
    EVENT_KEYWORDS[k].some(kw => lower.includes(kw))
  ) || null;
}

function getSmartDates(eventName) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const key = getEventKey(eventName);
  if (key) {
    return EVENT_SUGGESTIONS[key].map(({ month, day, label }) => {
      let d = new Date(today.getFullYear(), month, day);
      if (d <= today) d = new Date(today.getFullYear() + 1, month, day);
      return { date: d, label };
    });
  }

  // Genérico: 3 sábados próximos
  const nextSat = new Date(today);
  nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
  const sat2 = new Date(nextSat); sat2.setDate(nextSat.getDate() + 7);
  const in3w = new Date(today);   in3w.setDate(today.getDate() + 21);
  return [
    { date: nextSat, label: '📅 Próximo sábado'  },
    { date: sat2,    label: '📅 Sábado siguiente' },
    { date: in3w,    label: '🗓️ En tres semanas'  },
  ];
}

function buildQuickDates() {
  const nombre = document.getElementById('input-evento').value.trim() || 'el evento';
  document.getElementById('fecha-title').textContent = '¿Cuándo se celebra ' + nombre + '?';

  const container = document.getElementById('quick-dates');
  container.innerHTML = '';
  const fmt = new Intl.DateTimeFormat('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  getSmartDates(nombre).forEach(({ date, label }) => {
    const isoVal = date.toISOString().split('T')[0];
    const btn    = document.createElement('button');
    btn.className   = 'btn btn-outline-primary text-start quick-date-btn d-flex flex-column';
    btn.dataset.val = isoVal;
    btn.innerHTML   = `
      <span style="font-size:.72rem;opacity:.7;font-weight:600;line-height:1.4">${label}</span>
      <span>${fmt.format(date)}</span>
    `;
    btn.onclick = () => {
      document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('input-fecha').value = isoVal;
    };
    container.appendChild(btn);
  });
}

// ─────────────────────────────────────────
// STEP 6 – PRESUPUESTO
// ─────────────────────────────────────────
function selectBudget(btn, amount) {
  document.querySelectorAll('.budget-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedBudget = amount;
  document.getElementById('custom-budget-panel').classList.add('d-none');
}

function showCustomBudget() {
  document.querySelectorAll('.budget-btn').forEach(b => b.classList.remove('active'));
  selectedBudget = null;
  document.getElementById('custom-budget-panel').classList.remove('d-none');
  document.getElementById('input-presupuesto').focus();
}

// ─────────────────────────────────────────
// GUARDAR EN LOCALSTORAGE
// ─────────────────────────────────────────
function saveAndFinish() {
  const custom = parseFloat(document.getElementById('input-presupuesto').value);
  const budget = selectedBudget || custom;
  if (!budget) { alert('Selecciona o ingresa un presupuesto.'); return; }

  const data = {
    organizador:        document.getElementById('input-organizador').value.trim(),
    incluirOrganizador: document.getElementById('check-incluir').checked,
    participantes:      getParticipants(),
    exclusiones:        exclusionsData,
    nombreEvento:       document.getElementById('input-evento').value.trim(),
    fecha:              document.getElementById('input-fecha').value,
    presupuesto:        budget
  };

  localStorage.setItem('giftdraw_event', JSON.stringify(data));
  showStep(7);
}

// ─────────────────────────────────────────
// VER DATOS (LEE LOCALSTORAGE)
// ─────────────────────────────────────────
function showEventData() {
  const raw = localStorage.getItem('giftdraw_event');
  if (!raw) { alert('No hay datos en localStorage.'); return; }

  const ev  = JSON.parse(raw);
  const fmt = d => d ? new Intl.DateTimeFormat('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
                           .format(new Date(d + 'T12:00:00')) : '—';

  const exclTexto = Object.entries(ev.exclusiones || {})
    .filter(([,v]) => v.length)
    .map(([k,v]) => `${k} ≠ ${v.join(', ')}`)
    .join('<br>') || 'Ninguna';

  document.getElementById('event-info-body').innerHTML = `
    <table class="table table-bordered table-sm">
      <tr><th>Organizador</th><td>${ev.organizador}</td></tr>
      <tr><th>Celebración</th><td>${ev.nombreEvento || '—'}</td></tr>
      <tr><th>Fecha</th><td>${fmt(ev.fecha)}</td></tr>
      <tr><th>Presupuesto</th><td>$${ev.presupuesto} MXN</td></tr>
      <tr><th>Participantes</th><td>${ev.participantes.join(', ')}</td></tr>
      <tr><th>Exclusiones</th><td>${exclTexto}</td></tr>
    </table>
  `;
  showStep('info');
}

// ─────────────────────────────────────────
// SORTEO
// ─────────────────────────────────────────
function showDraw() {
  const raw = localStorage.getItem('giftdraw_event');
  if (!raw) { alert('Primero guarda el evento.'); return; }

  const ev     = JSON.parse(raw);
  const result = drawNames(ev.participantes, ev.exclusiones);

  if (!result) {
    alert('No fue posible realizar el sorteo respetando las exclusiones. Reduce algunas exclusiones e intenta de nuevo.');
    return;
  }

  const container = document.getElementById('draw-results');
  container.innerHTML = '';
  Object.entries(result).forEach(([giver, receiver]) => {
    const div = document.createElement('div');
    div.className = 'draw-pair';
    div.innerHTML = `<span class="giver">${giver}</span><span class="arrow">🎁 →</span><span class="receiver">${receiver}</span>`;
    container.appendChild(div);
  });

  showStep('draw');
}

// Algoritmo de sorteo con exclusiones (shuffle + verificar)
function drawNames(participants, exclusions, maxTries = 500) {
  for (let t = 0; t < maxTries; t++) {
    const receivers = shuffle([...participants]);
    let ok = true;
    const result = {};

    for (let i = 0; i < participants.length; i++) {
      const giver    = participants[i];
      const receiver = receivers[i];
      const excl     = (exclusions && exclusions[giver]) || [];
      if (giver === receiver || excl.includes(receiver)) { ok = false; break; }
      result[giver] = receiver;
    }

    if (ok) return result;
  }
  return null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─────────────────────────────────────────
// RESET
// ─────────────────────────────────────────
function resetForm() {
  document.getElementById('input-organizador').value = '';
  document.getElementById('check-incluir').checked   = true;
  document.getElementById('participants-list').innerHTML = '';
  document.getElementById('input-evento').value = '';
  document.getElementById('input-fecha').value  = '';
  document.getElementById('input-presupuesto').value = '';
  exclusionsData = {};
  hasExclusions  = false;
  selectedBudget = null;
  document.getElementById('btn-no-excl').className = 'btn btn-primary flex-fill';
  document.getElementById('btn-si-excl').className = 'btn btn-outline-primary flex-fill';
  document.getElementById('exclusions-panel').classList.add('d-none');
  document.getElementById('custom-budget-panel').classList.add('d-none');
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => showPage('inicio'));

// ─────────────────────────────────────────
// STEP 4 – DRAG & DROP TIPO DE EVENTO
// ─────────────────────────────────────────

let draggedChip = null;

function initEventDragDrop() {
  const chips   = document.querySelectorAll('.event-chip');
  const dropZone = document.getElementById('event-drop-zone');

  // Reset visual state
  chips.forEach(chip => {
    chip.classList.remove('used', 'dragging');
    chip.style.pointerEvents = '';
  });

  // Restore chip of currently selected event (if any)
  const currentVal = document.getElementById('input-evento').value.trim();
  if (currentVal) {
    chips.forEach(chip => {
      if (chip.dataset.label === currentVal) chip.classList.add('used');
    });
    showDroppedPreview(
      currentVal,
      [...chips].find(c => c.dataset.label === currentVal)?.querySelector('.chip-emoji')?.textContent || '🎉'
    );
  }

  // ── Chip events ──
  chips.forEach(chip => {
    chip.addEventListener('dragstart', e => {
      draggedChip = chip;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', chip.dataset.label);
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      draggedChip = null;
    });

    // Click también selecciona (por si no quieren arrastrar)
    chip.addEventListener('click', () => {
      if (chip.classList.contains('used')) return;
      clearDroppedEvent();
      dropEvent(chip.dataset.label, chip.querySelector('.chip-emoji').textContent, chip);
    });
  });

  // ── Drop zone events ──
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (!draggedChip || draggedChip.classList.contains('used')) return;
    dropEvent(
      draggedChip.dataset.label,
      draggedChip.querySelector('.chip-emoji').textContent,
      draggedChip
    );
  });
}

function dropEvent(label, emoji, chipEl) {
  // Si ya había un chip en la caja, liberarlo primero
  const currentLabel = document.getElementById('input-evento').value.trim();
  if (currentLabel) {
    document.querySelectorAll('.event-chip').forEach(c => {
      if (c.dataset.label === currentLabel) c.classList.remove('used');
    });
  }

  // Marcar el nuevo chip como usado
  if (chipEl) chipEl.classList.add('used');

  // Rellenar input
  document.getElementById('input-evento').value = label;

  // Mostrar preview en drop zone
  showDroppedPreview(label, emoji);
}

function showDroppedPreview(label, emoji) {
  document.getElementById('event-drop-hint').classList.add('d-none');
  const preview = document.getElementById('event-dropped-preview');
  preview.classList.remove('d-none');
  document.getElementById('event-preview-emoji').textContent = emoji;
  document.getElementById('event-preview-label').textContent = label;
  document.getElementById('event-drop-zone').classList.add('has-item');
}

function clearDroppedEvent() {
  // Restaurar hint
  document.getElementById('event-drop-hint').classList.remove('d-none');
  document.getElementById('event-dropped-preview').classList.add('d-none');
  document.getElementById('event-drop-zone').classList.remove('has-item', 'drag-over');

  // Limpiar input
  document.getElementById('input-evento').value = '';

  // Desmarcar chips
  document.querySelectorAll('.event-chip').forEach(c => c.classList.remove('used'));
}