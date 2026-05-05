/* ============================================================
   APP.JS v2 — Edición inline · Tracker mensual · Resumen anual
   Estado persistido en localStorage bajo STORAGE_KEY
   ============================================================ */

// ─── Constantes ───────────────────────────────────────────
const STORAGE_KEY = 'casaCasanueva_v2';
const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Estado en memoria ────────────────────────────────────
let state = { piezas: [], meses: {} };
let mesActivo = '';

// ─── Persistencia ─────────────────────────────────────────

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const guardado = JSON.parse(raw);
      state.meses  = guardado.meses || {};
      // Merge precios guardados con piezas definidas en datos.js
      state.piezas = datos.piezas.map(p => {
        const guardadaP = (guardado.piezas || []).find(sp => sp.id === p.id);
        return { id: p.id, precio: guardadaP ? guardadaP.precio : p.precio };
      });
      return;
    }
  } catch(e) { /* localStorage vacío o corrupto */ }
  state = {
    piezas: datos.piezas.map(p => ({ id: p.id, precio: p.precio })),
    meses: {}
  };
}

// ─── Acceso al estado ─────────────────────────────────────

function getPieza(id)   { return state.piezas.find(p => p.id === id); }
function getPrecio(id)  { const p = getPieza(id); return p ? p.precio : 0; }

/** Piezas con metadatos de datos.js + precio editable del estado */
function getPiezasConPrecio() {
  return datos.piezas.map(p => ({ ...p, precio: getPrecio(p.id) }));
}

// ─── Utilidades ───────────────────────────────────────────

function clp(n) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function parseMonto(str) {
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function hoyClave() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function nombreMes(clave) {
  if (!clave) return '';
  const [a, m] = clave.split('-').map(Number);
  return new Date(a, m-1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function mesAnterior(clave) {
  const [a, m] = clave.split('-').map(Number);
  const d = new Date(a, m-2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function mesSiguiente(clave) {
  const [a, m] = clave.split('-').map(Number);
  const d = new Date(a, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ─── Operaciones sobre meses ──────────────────────────────

function inicializarMes(clave) {
  if (state.meses[clave]) return;
  state.meses[clave] = {
    ingresos: getPiezasConPrecio().map(p => ({
      id: uid(), descripcion: p.nombre, monto: p.precio
    })),
    egresos: [{
      id: uid(),
      descripcion: 'Servicios (agua, luz, gas, wifi, jardinero, etc.)',
      monto: datos.gastos.total
    }]
  };
  guardar();
}

function totalesMes(clave) {
  if (!state.meses[clave]) return { ingresos: 0, egresos: 0, neto: 0 };
  const mes      = state.meses[clave];
  const ingresos = mes.ingresos.reduce((s, i) => s + i.monto, 0);
  const egresos  = mes.egresos.reduce((s, e)  => s + e.monto, 0);
  return { ingresos, egresos, neto: ingresos - egresos };
}

function totalesAnio(anio) {
  return Array.from({ length: 12 }, (_, i) => {
    const clave = `${anio}-${String(i+1).padStart(2,'0')}`;
    const tiene = !!state.meses[clave];
    return { clave, numero: i+1, tiene, ...totalesMes(clave) };
  });
}

// ─── Cálculo estándar (resumen y escenarios) ──────────────

function calcular() {
  const ingresosBrutos = getPiezasConPrecio().reduce((s,p) => s + p.precio, 0);
  const egresos        = datos.gastos.total;
  return { ingresosBrutos, egresos, ingresoNeto: ingresosBrutos - egresos };
}

// ─── RENDER: Header ──────────────────────────────────────

function renderHeader() {
  document.getElementById('header').innerHTML = `
    <div class="header-content">
      <div class="header-eyebrow">📍 ${datos.casa.barrio} · ${datos.casa.ciudad}</div>
      <h1 class="header-title">${datos.casa.nombre}</h1>
      <p class="header-subtitle">Administración de arriendo</p>
      <div class="header-pills">
        <span class="header-pill"><strong>4</strong> piezas arrendadas</span>
        <span class="header-pill"><strong>650 m²</strong> de terreno</span>
        <span class="header-pill"><strong>3</strong> baños nuevos</span>
        <span class="header-pill">🏊 Piscina</span>
      </div>
    </div>
  `;
}

// ─── RENDER: Nav ─────────────────────────────────────────

function renderNav() {
  const links = [
    { href: '#resumen-financiero', label: '📊 Resumen' },
    { href: '#piezas',             label: '🛏️ Piezas' },
    { href: '#tracker-mensual',    label: '📝 Registro mensual' },
    { href: '#gastos',             label: '📋 Gastos referencia' },
    { href: '#salario-admin',      label: '👤 Sueldo admin.' },
    { href: '#recuperacion',       label: '⏱️ Recuperación' },
    { href: '#caracteristicas',    label: '🏠 Características' },
  ];
  document.getElementById('nav-interna').innerHTML =
    `<ul>${links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul>`;
}

// ─── RENDER: Resumen ─────────────────────────────────────

function renderResumen() {
  const { ingresosBrutos, egresos, ingresoNeto } = calcular();
  const escA = datos.administradora.escenarios[0];
  const escB = datos.administradora.escenarios[1];

  document.getElementById('resumen-financiero').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">¿Cuánto entra y sale cada mes?</h2>
        <p class="section-subtitle">Resumen basado en los arriendos actuales. Puedes ver el detalle real mes a mes en el Registro mensual ↓</p>
        <div class="section-linea"></div>
      </div>

      <div class="resumen-grid">

        <div class="resumen-card resumen-card--entrada">
          <div class="card-emoji">💰</div>
          <div class="card-etiqueta">Lo que entra</div>
          <div class="card-monto" id="resumen-brutos">${clp(ingresosBrutos)}</div>
          <div class="card-nota">Total de los 4 arriendos</div>
        </div>

        <div class="resumen-card resumen-card--salida">
          <div class="card-emoji">📤</div>
          <div class="card-etiqueta">Lo que sale (servicios)</div>
          <div class="card-monto">${clp(egresos)}</div>
          <div class="card-nota">Agua, luz, gas, wifi, jardinero…</div>
        </div>

        <div class="resumen-card resumen-card--neto">
          <div class="card-etiqueta">✨ Lo que queda libre cada mes</div>
          <div class="card-monto" id="resumen-neto">${clp(ingresoNeto)}</div>
          <div class="card-nota">Antes del sueldo de la administradora</div>
        </div>

      </div>

      <div class="resumen-admin-bar">
        <span>👤 Descontando el sueldo de la admin.:</span>
        <span class="resumen-admin-chip">${escA.label}: propietario recibe ${clp(ingresoNeto - escA.sueldo)}/mes</span>
        <span class="resumen-admin-chip">${escB.label}: propietario recibe ${clp(ingresoNeto - escB.sueldo)}/mes</span>
      </div>
    </div>
  `;
}

// ─── RENDER: Piezas (precio editable inline) ─────────────

function renderPiezas() {
  const piezas = getPiezasConPrecio();
  const total  = piezas.reduce((s, p) => s + p.precio, 0);

  const piezasHTML = piezas.map(p => `
    <div class="room-card">
      <div class="room-header">
        <h3 class="room-name">${p.nombre}</h3>
        <span class="badge ${p.gastosIncluidos ? 'badge--included' : 'badge--separate'}">
          ${p.gastosIncluidos ? '✓ Gastos incluidos' : 'Gastos aparte'}
        </span>
      </div>

      <div class="room-price-wrapper">
        <span class="room-price-prefix">$</span>
        <input
          type="text"
          class="room-price-input"
          value="${p.precio.toLocaleString('es-CL')}"
          aria-label="Precio ${p.nombre}"
          onfocus="this.value=this.value.replace(/[^0-9]/g,''); this.select();"
          onblur="window.guardarPrecio('${p.id}', this)"
          onkeydown="if(event.key==='Enter') this.blur();"
        />
        <span class="room-price-period">/mes</span>
      </div>
      <div class="room-edit-hint">✏️ Toca el número para cambiar el arriendo</div>

      <div class="room-desc">${p.descripcion}</div>
      ${p.notas ? `<div class="room-note"><span class="room-note-icon">💬</span><span>${p.notas}</span></div>` : ''}
    </div>
  `).join('');

  document.getElementById('piezas').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">🛏️ Piezas arrendadas</h2>
        <p class="section-subtitle">Toca cualquier monto para actualizarlo cuando suba el arriendo — el resumen se recalcula solo.</p>
        <div class="section-linea"></div>
      </div>
      <div class="rooms-grid">${piezasHTML}</div>
      <div class="rooms-total">
        <span class="rooms-total-label">Total mensual de arriendos</span>
        <span class="rooms-total-value" id="rooms-total-value">${clp(total)} / mes</span>
      </div>
    </div>
  `;
}

window.guardarPrecio = function(piezaId, input) {
  const nuevo = parseMonto(input.value);
  const pieza = getPieza(piezaId);
  if (!pieza) return;

  if (!nuevo) {
    // Valor inválido: restaurar el precio anterior
    input.value = pieza.precio.toLocaleString('es-CL');
    return;
  }

  pieza.precio = nuevo;
  guardar();
  input.value = nuevo.toLocaleString('es-CL');

  // Actualizar total de piezas
  const total = getPiezasConPrecio().reduce((s, p) => s + p.precio, 0);
  const elTotal = document.getElementById('rooms-total-value');
  if (elTotal) elTotal.textContent = clp(total) + ' / mes';

  // Re-render secciones que dependen del precio
  renderResumen();
  renderSalarioAdmin();
  renderRecuperacion();
};

// ─── RENDER: Tracker mensual ─────────────────────────────

function filaItem(clave, tipo, item) {
  return `
    <tr data-id="${item.id}">
      <td>
        <input type="text" class="cell-input"
          value="${escapeHtml(item.descripcion)}"
          onchange="window.actualizarItem('${clave}','${tipo}','${item.id}','descripcion',this.value)" />
      </td>
      <td class="cell-td-amount">
        <span class="cell-currency">$</span>
        <input type="text" class="cell-input cell-input--amount"
          value="${item.monto.toLocaleString('es-CL')}"
          onfocus="this.value=this.value.replace(/[^0-9]/g,''); this.select();"
          onblur="window.actualizarItemMonto('${clave}','${tipo}','${item.id}',this)"
          onkeydown="if(event.key==='Enter') this.blur();" />
      </td>
      <td class="cell-td-action">
        <button class="btn-delete"
          onclick="window.eliminarItem('${clave}','${tipo}','${item.id}')"
          title="Eliminar fila">✕</button>
      </td>
    </tr>
  `;
}

function renderTablaAnual(anio, clave) {
  const mesesAnio  = totalesAnio(anio);
  const hayDatos   = mesesAnio.some(m => m.tiene);
  if (!hayDatos) return '';

  const totalAnual = mesesAnio.reduce((acc, m) => ({
    ingresos: acc.ingresos + m.ingresos,
    egresos:  acc.egresos  + m.egresos,
    neto:     acc.neto     + m.neto
  }), { ingresos: 0, egresos: 0, neto: 0 });

  const filasHTML = mesesAnio.map(m => `
    <tr class="${m.clave === clave ? 'anual-row--activo' : ''} ${!m.tiene ? 'anual-row--vacio' : ''}">
      <td class="anual-td-mes">${MESES_NOMBRES[m.numero - 1]}${m.clave === clave ? ' ★' : ''}</td>
      <td class="anual-td-num">${m.tiene ? clp(m.ingresos) : '—'}</td>
      <td class="anual-td-num anual-td--egreso">${m.tiene ? clp(m.egresos) : '—'}</td>
      <td class="anual-td-num anual-td--neto ${m.neto < 0 ? 'negativo' : ''}">${m.tiene ? clp(m.neto) : '—'}</td>
    </tr>
  `).join('');

  return `
    <div class="tracker-anual" id="tracker-anual">
      <div class="tracker-anual-header">
        <h3 class="tracker-anual-title">📅 Historial anual ${anio}</h3>
        <span class="tracker-anual-subtitle">★ = mes actual · — = sin registro aún</span>
      </div>
      <div class="tracker-anual-table-wrap">
        <table class="anual-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th class="th-right">Entró 💚</th>
              <th class="th-right">Salió 🔴</th>
              <th class="th-right">Quedó libre</th>
            </tr>
          </thead>
          <tbody>${filasHTML}</tbody>
          <tfoot>
            <tr>
              <td class="anual-tfoot-label">TOTAL ${anio}</td>
              <td class="anual-tfoot-num">${clp(totalAnual.ingresos)}</td>
              <td class="anual-tfoot-num anual-td--egreso">${clp(totalAnual.egresos)}</td>
              <td class="anual-tfoot-num">${clp(totalAnual.neto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function renderTracker() {
  const clave = mesActivo;
  inicializarMes(clave);
  const mes  = state.meses[clave];
  const { ingresos: totalI, egresos: totalE, neto } = totalesMes(clave);
  const anio = Number(clave.split('-')[0]);

  document.getElementById('tracker-mensual').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">📝 Registro mensual</h2>
        <p class="section-subtitle">Aquí puedes anotar todo lo que entró y salió cada mes. Edita cualquier cifra, agrega o elimina filas. Se guarda automáticamente.</p>
        <div class="section-linea"></div>
      </div>

      <!-- Navegación de mes -->
      <div class="tracker-nav">
        <button class="tracker-nav-btn" onclick="window.navegarMes('prev')">← Mes anterior</button>
        <h3 class="tracker-mes-nombre">${nombreMes(clave)}</h3>
        <button class="tracker-nav-btn" onclick="window.navegarMes('next')">Mes siguiente →</button>
      </div>

      <!-- Tip de uso -->
      <div class="tracker-tip">
        <span class="tracker-tip-icon">💡</span>
        <span>Haz clic en cualquier descripción o monto para editarlo. Usa <strong>+ Agregar</strong> para añadir un arriendo extra, una reparación o cualquier gasto del mes.</span>
      </div>

      <!-- Columnas entradas / salidas -->
      <div class="tracker-grid">

        <!-- LO QUE ENTRA -->
        <div class="tracker-col tracker-col--entrada">
          <div class="tracker-col-header tracker-col-header--ingreso">
            <span class="tracker-col-icon">💚</span>
            <span>Lo que entró</span>
            <span class="tracker-col-total" id="total-ingresos">${clp(totalI)}</span>
          </div>
          <table class="tracker-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th class="th-right">Monto ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody-ingresos">
              ${mes.ingresos.map(i => filaItem(clave, 'ingresos', i)).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td class="tfoot-label">TOTAL ENTRADAS</td>
                <td class="tfoot-value" id="total-ingresos-foot">${clp(totalI)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <button class="btn-add-row" onclick="window.agregarIngreso('${clave}')">
            ＋ Agregar ingreso
          </button>
        </div>

        <!-- LO QUE SALE -->
        <div class="tracker-col tracker-col--salida">
          <div class="tracker-col-header tracker-col-header--egreso">
            <span class="tracker-col-icon">🔴</span>
            <span>Lo que salió</span>
            <span class="tracker-col-total" id="total-egresos">${clp(totalE)}</span>
          </div>
          <table class="tracker-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th class="th-right">Monto ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody-egresos">
              ${mes.egresos.map(e => filaItem(clave, 'egresos', e)).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td class="tfoot-label">TOTAL SALIDAS</td>
                <td class="tfoot-value tfoot-value--egreso" id="total-egresos-foot">${clp(totalE)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <button class="btn-add-row" onclick="window.agregarEgreso('${clave}')">
            ＋ Agregar gasto
          </button>
        </div>

      </div><!-- /tracker-grid -->

      <!-- Resultado neto -->
      <div class="tracker-neto ${neto < 0 ? 'tracker-neto--negativo' : ''}" id="tracker-neto-banner">
        <div>
          <div class="tracker-neto-label">${neto >= 0 ? '✅ Quedó libre este mes' : '⚠️ Déficit del mes'}</div>
          <div class="tracker-neto-sub">${nombreMes(clave)}</div>
        </div>
        <span class="tracker-neto-value" id="tracker-neto-value">${clp(neto)}</span>
      </div>

      <!-- Historial anual -->
      ${renderTablaAnual(anio, clave)}

    </div>
  `;
}

// ─── Acciones del tracker (expuestas en window) ───────────

window.navegarMes = function(dir) {
  mesActivo = dir === 'prev' ? mesAnterior(mesActivo) : mesSiguiente(mesActivo);
  renderTracker();
};

window.agregarIngreso = function(clave) {
  state.meses[clave].ingresos.push({ id: uid(), descripcion: 'Nuevo ingreso', monto: 0 });
  guardar();
  renderTracker();
};

window.agregarEgreso = function(clave) {
  state.meses[clave].egresos.push({ id: uid(), descripcion: 'Nuevo gasto', monto: 0 });
  guardar();
  renderTracker();
};

window.eliminarItem = function(clave, tipo, id) {
  const lista = state.meses[clave][tipo];
  const idx   = lista.findIndex(i => i.id === id);
  if (idx === -1) return;
  lista.splice(idx, 1);
  guardar();
  actualizarTotalesDisplay(clave);
  // Quitar la fila del DOM sin re-render completo
  const fila = document.querySelector(`[data-id="${id}"]`);
  if (fila) fila.remove();
};

window.actualizarItem = function(clave, tipo, id, campo, valor) {
  const item = state.meses[clave][tipo].find(i => i.id === id);
  if (!item) return;
  item[campo] = valor;
  guardar();
};

window.actualizarItemMonto = function(clave, tipo, id, input) {
  const monto = parseMonto(input.value);
  const item  = state.meses[clave][tipo].find(i => i.id === id);
  if (!item) return;
  item.monto = monto;
  guardar();
  input.value = monto.toLocaleString('es-CL');
  actualizarTotalesDisplay(clave);
};

/** Actualiza totales y tabla anual sin re-renderizar toda la sección */
function actualizarTotalesDisplay(clave) {
  const { ingresos, egresos, neto } = totalesMes(clave);

  // Actualizar totales del header de columna y tfoot
  const ids = ['total-ingresos', 'total-ingresos-foot'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = clp(ingresos); });
  const idsE = ['total-egresos', 'total-egresos-foot'];
  idsE.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = clp(egresos); });

  const elN    = document.getElementById('tracker-neto-value');
  const banner = document.getElementById('tracker-neto-banner');

  if (elN) elN.textContent = clp(neto);
  if (banner) {
    banner.className = `tracker-neto ${neto < 0 ? 'tracker-neto--negativo' : ''}`;
    const label = banner.querySelector('.tracker-neto-label');
    if (label) label.textContent = neto >= 0 ? '✅ Quedó libre este mes' : '⚠️ Déficit del mes';
  }

  // Actualizar / crear tabla anual
  const anio = Number(clave.split('-')[0]);
  const anualEl = document.getElementById('tracker-anual');
  const contenedor = document.querySelector('#tracker-mensual .section-container');

  if (anualEl) {
    // Re-render solo la tabla anual
    const nuevoHTML = renderTablaAnual(anio, clave);
    anualEl.outerHTML = nuevoHTML || '';
  } else if (contenedor) {
    // No existía aún → insertarla si ahora hay datos
    const nuevoHTML = renderTablaAnual(anio, clave);
    if (nuevoHTML) contenedor.insertAdjacentHTML('beforeend', nuevoHTML);
  }
}

// ─── RENDER: Gastos (referencial, estático) ───────────────

function renderGastos() {
  const detalleHTML = datos.gastos.detalle.map(g => `
    <div class="expense-item">
      <span class="expense-name">${g.nombre}</span>
      <span class="expense-amount">${clp(g.monto)}</span>
    </div>
  `).join('');

  document.getElementById('gastos').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">📋 Gastos de referencia</h2>
        <p class="section-subtitle">Desglose estimado de los servicios de la casa. Para anotar gastos reales del mes, usa el Registro mensual ↑</p>
        <div class="section-linea"></div>
      </div>
      <div class="expenses-wrapper">
        <div class="expense-list">
          ${detalleHTML}
          <div class="expense-item expense-item--total">
            <span class="expense-name">Total estimado mensual</span>
            <span class="expense-amount">${clp(datos.gastos.total)}</span>
          </div>
        </div>
        <div class="expenses-note-card">
          <div class="expenses-note-title">Nota sobre la administradora</div>
          <div class="expenses-note-text">
            ${datos.gastos.nota}. Esta condición forma parte del acuerdo de administración y
            representa un beneficio en especie adicional al sueldo en efectivo.
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── RENDER: Sueldo administradora ───────────────────────

function renderSalarioAdmin() {
  const { ingresoNeto } = calcular();

  const escenariosHTML = datos.administradora.escenarios.map((e, i) => {
    const neto = ingresoNeto - e.sueldo;
    return `
      <div class="scenario-card ${i === 0 ? 'scenario-card--primary' : ''}">
        <div class="scenario-label">${e.label}</div>
        <div class="scenario-row">
          <span class="scenario-row-label">Ingreso neto disponible</span>
          <span class="scenario-row-value">${clp(ingresoNeto)}</span>
        </div>
        <div class="scenario-row">
          <span class="scenario-row-label">Sueldo administradora</span>
          <span class="scenario-row-value scenario-row-value--salary">– ${clp(e.sueldo)}</span>
        </div>
        <div class="scenario-divider"></div>
        <div class="scenario-net-label">Queda para el propietario</div>
        <div class="scenario-net-value">${clp(neto)}<span class="scenario-net-period">/mes</span></div>
      </div>
    `;
  }).join('');

  document.getElementById('salario-admin').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">👤 ¿Cuánto queda para el propietario?</h2>
        <p class="section-subtitle">Dos escenarios según el sueldo de la administradora — el resto es para el propietario.</p>
        <div class="section-linea"></div>
      </div>
      <div class="scenarios-grid">${escenariosHTML}</div>
    </div>
  `;
}

// ─── RENDER: Recuperación remodelación ───────────────────

function renderRecuperacion() {
  const { ingresoNeto } = calcular();

  const cardsHTML = datos.administradora.escenarios.map(e => {
    const neto  = ingresoNeto - e.sueldo;
    const meses = Math.ceil(datos.remodelacion.costo / neto);
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    const pct   = Math.min((12 * neto / datos.remodelacion.costo) * 100, 100).toFixed(1);
    const dur   = [
      anios > 0 ? `${anios} año${anios > 1 ? 's' : ''}` : '',
      resto > 0 ? `${resto} mes${resto > 1 ? 'es' : ''}` : ''
    ].filter(Boolean).join(' y ');

    return `
      <div class="recovery-card">
        <div class="recovery-card-label">${e.label} — Sueldo admin. ${clp(e.sueldo)}</div>
        <div class="recovery-months-row">
          <span class="recovery-months-big">${meses}</span>
          <span class="recovery-months-unit">meses</span>
        </div>
        <div class="recovery-years-text">equivale a ${dur}</div>
        <div class="recovery-monthly">Propietario recibe <strong>${clp(neto)}/mes</strong></div>
        <div class="recovery-bar-label">
          <span>0%</span>
          <span>Recuperado al año 1: ${pct}%</span>
        </div>
        <div class="recovery-bar-track">
          <div class="recovery-bar-fill" style="width:0%" data-target="${pct}"></div>
        </div>
        <div class="recovery-bar-caption">de ${clp(datos.remodelacion.costo)} invertidos</div>
      </div>
    `;
  }).join('');

  document.getElementById('recuperacion').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">⏱️ ¿En cuánto tiempo se recupera la remodelación?</h2>
        <p class="section-subtitle">Calculado en base a lo que recibe el propietario cada mes.</p>
        <div class="section-linea"></div>
      </div>
      <div class="recovery-cost-badge">
        <div>
          <div class="recovery-cost-label">Inversión total en remodelación</div>
          <div class="recovery-cost-value">${clp(datos.remodelacion.costo)}</div>
        </div>
      </div>
      <div class="recovery-grid">${cardsHTML}</div>
    </div>
  `;

  animarBarras();
}

function animarBarras() {
  const fills = document.querySelectorAll('.recovery-bar-fill[data-target]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.target + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  fills.forEach(el => {
    const rect = el.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    if (visible) {
      el.style.width = el.dataset.target + '%';
    } else {
      obs.observe(el);
    }
  });
}

// ─── RENDER: Características ─────────────────────────────

function renderCaracteristicas() {
  const featuresHTML = datos.caracteristicas.map(c => `
    <div class="feature-card">
      <div class="feature-icon">${c.icono}</div>
      <div>
        <div class="feature-title">${c.titulo}</div>
        <div class="feature-detail">${c.detalle}</div>
      </div>
    </div>
  `).join('');

  document.getElementById('caracteristicas').innerHTML = `
    <div class="section-container">
      <div class="section-header">
        <h2 class="section-title">🏠 La casa</h2>
        <p class="section-subtitle">Características y equipamiento de la propiedad.</p>
        <div class="section-linea"></div>
      </div>
      <div class="features-grid">${featuresHTML}</div>
    </div>
  `;
}

// ─── RENDER: Footer ──────────────────────────────────────

function renderFooter() {
  const mes = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  document.getElementById('footer').innerHTML = `
    <strong>${datos.casa.nombre}</strong><br>
    ${datos.casa.barrio} · ${datos.casa.ciudad}<br><br>
    Página de administración interna · Actualizada ${mes}
  `;
}

// ─── Inicialización ──────────────────────────────────────

function init() {
  cargar();
  mesActivo = hoyClave();

  renderHeader();
  renderNav();
  renderResumen();
  renderPiezas();
  renderTracker();
  renderGastos();
  renderSalarioAdmin();
  renderRecuperacion();
  renderCaracteristicas();
  renderFooter();
}

document.addEventListener('DOMContentLoaded', init);
