/**
 * catalogo.js — CATÁLOGO: FILTROS + TARJETAS
 * ============================================
 * Responsabilidades:
 *  - Cargar inventario y cachear
 *  - Renderizar tarjetas con filtros y orden
 *  - Chips de tipo rápido
 *  - Paginación "Ver más"
 *  - Parámetros de URL compartibles
 *  - Contador hero en vivo
 */

'use strict';

/* ---- Constantes ---- */
const PAGE_SIZE = 12; // tarjetas por página

/* ---- Estado del módulo ---- */
let _inventario    = [];   // todos los inmuebles disponibles
let _filtrados     = [];   // resultado de aplicar filtros
let _pagina        = 1;
let _ordenAleatorio = [];  // shuffle estable por sesión

/* =============================================================
 * INICIALIZACIÓN
 * ============================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  _inyectarMarca();
  _iniciarFiltros();
  _iniciarNav();

  try {
    _inventario = await cargarInventario();
    _ordenAleatorio = _shuffle([..._inventario]);
    _poblarFiltroBarrio();
    _poblarChipsTipo();
    _leerParamsURL();
    aplicarFiltros();
    _actualizarHeroStats();
    _actualizarAboutStats();
    // Exponer el inventario globalmente para que ficha.js pueda leer ?ver= al cargar
    window._inventario = _inventario;
    document.dispatchEvent(new CustomEvent('inventarioListo'));
  } catch (e) {
    console.error('[catalogo] Error al cargar:', e);
    document.getElementById('cards-grid').innerHTML =
      '<div class="loading-state"><p>Error al cargar el catálogo. Recarga la página.</p></div>';
  }
});

/* =============================================================
 * MARCA — inyectar valores de CONFIG en el DOM
 * ============================================================= */
function _inyectarMarca() {
  const C = window.CONFIG;

  // Colores CSS
  document.documentElement.style.setProperty('--color-primario',    C.COLOR_PRIMARIO || '#0f5b4f');
  document.documentElement.style.setProperty('--color-primario-dk', _oscurecer(C.COLOR_PRIMARIO, 10));
  document.documentElement.style.setProperty('--color-acento',      C.COLOR_ACENTO   || '#e7f2ef');

  // Textos
  _set('brand-name',    C.MARCA_NOMBRE);
  _set('hero-ciudad',   C.CIUDAD);
  _set('about-nombre',  C.MARCA_NOMBRE);
  _set('about-frase',   C.MARCA_FRASE);
  _set('about-ciudad',  C.CIUDAD);
  _set('footer-brand',  C.MARCA_NOMBRE);
  _set('footer-copy',   '© ' + new Date().getFullYear() + ' ' + C.MARCA_NOMBRE);
  document.title = 'Inmuebles en ' + C.CIUDAD + ' | ' + C.MARCA_NOMBRE;

  // Logo / avatar
  const logoImg = document.getElementById('logo-img');
  const logoMon = document.getElementById('logo-monogram');
  if (C.LOGO_URL) {
    logoImg.src = C.LOGO_URL; logoImg.hidden = false; logoMon.hidden = true;
  } else {
    const iniciales = C.MARCA_NOMBRE.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    logoMon.textContent = iniciales;
    document.getElementById('agente-avatar').textContent = iniciales;
    document.getElementById('logo-monogram').hidden = false;
  }

  // Foto del agente
  const fotoEl = document.getElementById('agente-foto');
  const avEl   = document.getElementById('agente-avatar');
  if (C.FOTO_AGENTE_URL) { fotoEl.src = C.FOTO_AGENTE_URL; fotoEl.hidden = false; avEl.hidden = true; }

  // WhatsApp FAB
  const fab = document.getElementById('whatsapp-fab');
  if (C.WHATSAPP_NUMBER) {
    fab.href = waUrl(C.WHATSAPP_NUMBER, '¡Hola! Visité su catálogo de inmuebles y me gustaría más información.');
    fab.addEventListener('click', () => pixelContact());
  } else {
    fab.hidden = true;
  }
}

function _set(id, val) { const el = document.getElementById(id); if (el && val) el.textContent = val; }
function _oscurecer(hex, pct) {
  if (!hex) return '#0c4c42';
  try {
    const n = parseInt(hex.replace('#',''), 16);
    const f = (1 - pct/100);
    return '#' + [n>>16, (n>>8)&255, n&255].map(c => Math.max(0,Math.round(c*f)).toString(16).padStart(2,'0')).join('');
  } catch { return '#0c4c42'; }
}

/* =============================================================
 * FILTROS
 * ============================================================= */
function _iniciarFiltros() {
  // Toggle filtros en móvil
  const toggle = document.getElementById('filters-toggle');
  const panel  = document.getElementById('filters-panel');
  toggle && toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Cambios en filtros → reaplicar
  ['f-tipo','f-barrio','f-negocio','f-hab','f-orden'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('change', () => { _pagina = 1; aplicarFiltros(); });
  });
  ['f-precio-min','f-precio-max'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', debounce(() => { _pagina = 1; aplicarFiltros(); }, 400));
  });

  // Limpiar
  document.getElementById('btn-reset-filtros') &&
    document.getElementById('btn-reset-filtros').addEventListener('click', resetFiltros);

  // Copiar enlace
  document.getElementById('btn-copiar-link') &&
    document.getElementById('btn-copiar-link').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => toast('Enlace copiado', 'ok'));
    });

  // Ver más
  document.getElementById('btn-cargar-mas') &&
    document.getElementById('btn-cargar-mas').addEventListener('click', () => {
      _pagina++; _renderTarjetas(false);
    });
}

function _poblarFiltroBarrio() {
  const barrios = [...new Set(_inventario.map(i => i.barrio).filter(Boolean))].sort();
  const sel = document.getElementById('f-barrio');
  if (!sel) return;
  barrios.forEach(b => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = b;
    sel.appendChild(opt);
  });
}

function _poblarChipsTipo() {
  const tipos = [...new Set(_inventario.map(i => i.tipo).filter(Boolean))].sort();
  const cont  = document.getElementById('type-chips');
  if (!cont) return;
  tipos.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'type-chip'; btn.textContent = t;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const activo = btn.getAttribute('aria-pressed') === 'true';
      document.querySelectorAll('.type-chip').forEach(c => c.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed', String(!activo));
      const sel = document.getElementById('f-tipo');
      if (sel) sel.value = activo ? '' : t;
      _pagina = 1; aplicarFiltros();
    });
    cont.appendChild(btn);
  });
}

function _leerParamsURL() {
  _setVal('f-tipo',      getParam('tipo'));
  _setVal('f-barrio',    getParam('barrio'));
  _setVal('f-negocio',   getParam('negocio'));
  _setVal('f-precio-min',getParam('precioMin'));
  _setVal('f-precio-max',getParam('precioMax'));
  _setVal('f-hab',       getParam('hab'));
  _setVal('f-orden',     getParam('orden'));
}
function _setVal(id, v) { const el = document.getElementById(id); if (el && v) el.value = v; }

function aplicarFiltros() {
  const tipo     = _gv('f-tipo');
  const barrio   = _gv('f-barrio');
  const negocio  = _gv('f-negocio');
  const precMin  = parseFloat(_gv('f-precio-min')) * 1e6 || 0;
  const precMax  = parseFloat(_gv('f-precio-max')) * 1e6 || Infinity;
  const hab      = parseInt(_gv('f-hab')) || 0;
  const orden    = _gv('f-orden') || 'aleatorio';

  _filtrados = (orden === 'aleatorio' ? _ordenAleatorio : [..._inventario]).filter(inm => {
    if (tipo   && !inm.tipo?.includes(tipo))                    return false;
    if (barrio && normTexto(inm.barrio) !== normTexto(barrio))  return false;
    if (negocio && !inm.servicio?.includes(negocio))            return false;
    const p = parseMoneda(inm.precio);
    if (p && (p < precMin || p > precMax))                      return false;
    if (hab && (parseInt(inm.habitaciones) || 0) < hab)         return false;
    return true;
  });

  if (orden === 'precio-asc')  _filtrados.sort((a,b) => parseMoneda(a.precio) - parseMoneda(b.precio));
  if (orden === 'precio-desc') _filtrados.sort((a,b) => parseMoneda(b.precio) - parseMoneda(a.precio));
  if (orden === 'area-desc')   _filtrados.sort((a,b) => (parseFloat(b.area)||0)   - (parseFloat(a.area)||0));

  // Actualizar badge de filtros activos
  const activos = [tipo,barrio,negocio,precMin||'',precMax===Infinity?'':precMax,hab||''].filter(Boolean).length;
  const badge = document.getElementById('filters-badge');
  if (badge) { badge.textContent = activos; badge.hidden = activos === 0; }

  // Guardar en URL
  setParams({ tipo, barrio, negocio, precioMin: precMin/1e6 || '', precioMax: precMax===Infinity?'':precMax/1e6, hab: hab||'', orden: orden==='aleatorio'?'':orden });

  _pagina = 1;
  _renderTarjetas(true);
  _actualizarSubtitulo();
}

function resetFiltros() {
  ['f-tipo','f-barrio','f-negocio','f-hab','f-orden'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['f-precio-min','f-precio-max'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('.type-chip').forEach(c => c.setAttribute('aria-pressed','false'));
  _ordenAleatorio = _shuffle([..._inventario]); // nuevo shuffle
  _pagina = 1;
  aplicarFiltros();
}

function _gv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

/* =============================================================
 * RENDER TARJETAS
 * ============================================================= */
function _renderTarjetas(reset) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  const inicio = 0;
  const fin    = _pagina * PAGE_SIZE;
  const slice  = _filtrados.slice(inicio, fin);

  if (reset) grid.innerHTML = '';

  if (_filtrados.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <p>No encontramos inmuebles con esos filtros.</p>
      <button class="btn btn--outline" onclick="resetFiltros()">Limpiar filtros</button>
    </div>`;
    document.getElementById('pagination').hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  slice.forEach((inm, i) => {
    if (!reset && i < ((_pagina-1) * PAGE_SIZE)) return; // solo agregar nuevas
    fragment.appendChild(_crearTarjeta(inm));
  });
  grid.appendChild(fragment);

  // Paginación
  const pag  = document.getElementById('pagination');
  const info = document.getElementById('pagination-info');
  if (fin < _filtrados.length) {
    pag.hidden = false;
    info.textContent = `Mostrando ${Math.min(fin, _filtrados.length)} de ${_filtrados.length} inmuebles`;
  } else {
    pag.hidden = true;
  }
}

function _crearTarjeta(inm) {
  const precio  = parseMoneda(inm.precio);
  const canon   = parseMoneda(inm.canon);
  const precioStr = precio ? formatPrecio(precio) : (canon ? formatPrecio(canon) + '/mes' : 'Consultar');
  // El servicio real viene directo de la columna "servicio" de la hoja.
  // Solo si llegara vacío, se adivina a partir de si hay precio y/o canon.
  const label     = (inm.servicio && inm.servicio.trim()) || (precio && canon ? 'Venta y Arriendo' : precio ? 'Venta' : 'Arriendo');
  const fotos     = (inm.fotos || '').split(',').map(f => f.trim()).filter(Boolean);

  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${inm.tipo} en ${inm.barrio} — ${precioStr}`);

  const imgHtml = inm._img
    ? `<img class="card-img" src="${escHtml(inm._img)}" alt="${escHtml(inm.tipo)} en ${escHtml(inm.barrio)}" loading="lazy" />`
    : `<div class="card-no-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg><span>Sin imagen</span></div>`;

  card.innerHTML = `
    <div class="card-img-wrap">
      ${imgHtml}
      <div class="card-badges">
        <span class="badge badge--servicio">${escHtml(label)}</span>
        ${inm.credito && /sí|si|aplica/i.test(inm.credito) ? '<span class="badge badge--credito">✓ Crédito</span>' : ''}
      </div>
    </div>
    <div class="card-body">
      <p class="card-barrio">${escHtml(inm.barrio || inm.zona || '')}</p>
      <p class="card-tipo">${escHtml(inm.tipo || '')}</p>
      <p class="card-precio">${escHtml(precioStr)}<span class="card-precio-label">${label.includes('Arriendo') && !precio ? '' : ''}</span></p>
      <div class="card-specs">
        ${inm.area          ? `<span class="spec-item"><span class="spec-icon">📐</span>${escHtml(inm.area)} m²</span>` : ''}
        ${inm.habitaciones  ? `<span class="spec-item"><span class="spec-icon">🛏</span>${escHtml(inm.habitaciones)} hab</span>` : ''}
        ${inm.banos         ? `<span class="spec-item"><span class="spec-icon">🚿</span>${escHtml(inm.banos)} baños</span>` : ''}
        ${inm.parqueadero && inm.parqueadero !== '0' ? `<span class="spec-item"><span class="spec-icon">🚗</span>${escHtml(inm.parqueadero)} parq</span>` : ''}
        ${inm.estrato       ? `<span class="spec-item"><span class="spec-icon">⭐</span>Estrato ${escHtml(inm.estrato)}</span>` : ''}
        ${inm.piso          ? `<span class="spec-item"><span class="spec-icon">🏢</span>Piso ${escHtml(inm.piso)}</span>` : ''}
      </div>
    </div>`;

  // Eventos
  card.addEventListener('click', () => abrirFicha(inm));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFicha(inm); } });

  return card;
}

/* =============================================================
 * ESTADÍSTICAS (hero + about)
 * ============================================================= */
function _actualizarHeroStats() {
  const tipos = [...new Set(_inventario.map(i=>i.tipo))].length;
  const barrios = [...new Set(_inventario.map(i=>i.barrio))].length;
  const cont = document.getElementById('hero-stats');
  if (!cont) return;
  cont.innerHTML = `
    <div class="hero-stat-item"><span class="hero-stat-n">${_inventario.length}</span><span class="hero-stat-l">Inmuebles disponibles</span></div>
    <div class="hero-stat-item"><span class="hero-stat-n">${tipos}</span><span class="hero-stat-l">Tipos de propiedad</span></div>
    <div class="hero-stat-item"><span class="hero-stat-n">${barrios}</span><span class="hero-stat-l">Barrios y zonas</span></div>`;
}

function _actualizarAboutStats() {
  const cont = document.getElementById('about-stats');
  if (!cont) return;
  const ventas = _inventario.filter(i => /venta/i.test(i.servicio)).length;
  cont.innerHTML = `
    <div class="about-stat"><div class="about-stat-n">${_inventario.length}+</div><div class="about-stat-l">Inmuebles</div></div>
    <div class="about-stat"><div class="about-stat-n">${ventas}</div><div class="about-stat-l">En venta</div></div>`;
}

function _actualizarSubtitulo() {
  const el = document.getElementById('catalogo-sub');
  if (!el) return;
  const n = _filtrados.length;
  el.textContent = n === _inventario.length
    ? `${n} propiedades disponibles`
    : `${n} resultado${n!==1?'s':''} con tus filtros`;
}

/* ---- Shuffle Fisher-Yates ---- */
function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---- Navegación activa en scroll ---- */
function _iniciarNav() {
  const links = document.querySelectorAll('.nav-link[data-section], .drawer-link[data-section]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.dataset.section === e.target.id));
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('section[id]').forEach(s => obs.observe(s));
}
