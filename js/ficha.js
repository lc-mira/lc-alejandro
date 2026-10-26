/**
 * ficha.js — OVERLAY DE DETALLE DEL INMUEBLE
 * ============================================
 * Abre el panel lateral con Swiper, datos y CTA de contacto.
 */

'use strict';

let _swiperInst = null;
let _inm_actual = null;

/** Construye el slug compartible de un inmueble (?ver=tipo-barrio-id). */
function _slugInmueble(inm) {
  return `${normTexto(inm.tipo)}-${normTexto(inm.barrio)}-${inm.id || ''}`.replace(/\s+/g,'-');
}

/** Abre la ficha de un inmueble. Lo llama catalogo.js al hacer clic en tarjeta. */
function abrirFicha(inm) {
  _inm_actual = inm;
  const overlay = document.getElementById('ficha-overlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  _renderFicha(inm);
  pixelViewContent(inm);

  // Empujamos un estado al historial (en vez de reemplazarlo) para que el
  // botón "atrás" del navegador/celular cierre el overlay y el usuario
  // siga explorando el catálogo donde estaba, en vez de salir de la página.
  history.pushState({ lcFicha: true }, '', '?ver=' + _slugInmueble(inm));
}

function cerrarFicha() {
  // Si el overlay se abrió empujando un estado (caso normal), retrocedemos
  // en el historial; el listener de popstate hace el cierre visual.
  if (history.state && history.state.lcFicha) {
    history.back();
  } else {
    _cerrarFichaUI();
  }
}

function _cerrarFichaUI() {
  document.getElementById('ficha-overlay').hidden = true;
  document.body.style.overflow = '';
  if (_swiperInst) { _swiperInst.destroy(true,true); _swiperInst = null; }
}

// Cuando el usuario usa el botón/gesto "atrás", solo cerramos visualmente
// (el navegador ya hizo la navegación, no hay que tocar el historial de nuevo).
window.addEventListener('popstate', (e) => {
  if (!(e.state && e.state.lcFicha)) _cerrarFichaUI();
});

function _renderFicha(inm) {
  const precio = parseMoneda(inm.precio);
  const canon  = parseMoneda(inm.canon);
  const precioStr = precio ? formatPrecio(precio) : (canon ? formatPrecio(canon) : 'Consultar');
  const label     = precio && canon ? '/mes arriendo' : precio ? '' : '/mes';

  // Carrusel
  const fotos = [inm._img, ...(inm.fotos || '').split(',').map(f=>f.trim()).filter(Boolean)]
    .filter((f,i,a) => f && a.indexOf(f)===i); // únicas
  const slidesEl = document.getElementById('swiper-slides');
  slidesEl.innerHTML = fotos.length
    ? fotos.map(f => `<div class="swiper-slide"><img src="${escHtml(f)}" alt="${escHtml(inm.tipo)} en ${escHtml(inm.barrio)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"/></div>`).join('')
    : `<div class="swiper-slide" style="display:flex;align-items:center;justify-content:center;background:var(--color-fondo);min-height:240px"><span style="color:var(--color-tenue)">Sin fotos</span></div>`;

  if (_swiperInst) { _swiperInst.destroy(true,true); }
  if (window.Swiper && fotos.length > 1) {
    _swiperInst = new Swiper('#ficha-swiper', {
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { prevEl: '.swiper-button-prev', nextEl: '.swiper-button-next' },
      loop: fotos.length > 2,
      lazy: true,
    });
  }

  // Cuerpo
  document.getElementById('ficha-body').innerHTML = `
    <p class="ficha-barrio">${escHtml(inm.barrio || '')} ${inm.zona ? '· ' + escHtml(inm.zona) : ''}</p>
    <p class="ficha-tipo">${escHtml(inm.tipo || '')} ${inm.estrato ? '· Estrato ' + escHtml(inm.estrato) : ''}</p>
    <p class="ficha-precio">${escHtml(precioStr)}<span class="ficha-precio-label">${label}</span></p>

    <div class="ficha-specs">
      ${_spec('📐', inm.area, 'Área', 'm²')}
      ${_spec('🛏', inm.habitaciones, 'Habitaciones')}
      ${_spec('🚿', inm.banos, 'Baños')}
      ${_spec('🏢', inm.piso, _esCasa(inm.tipo) ? 'Niveles' : 'Piso')}
      ${_spec('💳', _formaPago(inm.credito), 'Forma de Pago')}
    </div>

    ${inm.observaciones ? `<p class="ficha-obs">${escHtml(inm.observaciones)}</p>` : ''}

    ${inm.captacion ? `<div class="ficha-caract"><span class="caract-chip">🏗 ${escHtml(inm.captacion)}</span></div>` : ''}

    <div id="ficha-similares"></div>`;

  // CTA
  const btnLead = document.getElementById('btn-ficha-lead');
  btnLead.onclick = () => _abrirMiniLead(inm, precioStr);

  // Similares (asíncronos para no bloquear)
  setTimeout(() => _renderSimilares(inm), 200);
}

function _spec(icon, val, label, unidad = '') {
  if (!val || val === '0') return '';
  return `<div class="ficha-spec">
    <span class="ficha-spec-icon">${icon}</span>
    <span class="ficha-spec-val">${escHtml(String(val))}${unidad}</span>
    <span class="ficha-spec-lbl">${label}</span>
  </div>`;
}

/** true si el tipo de inmueble es una casa (el campo "piso" ahí significa niveles). */
function _esCasa(tipo) {
  const t = (tipo || '').trim().toLowerCase();
  return t === 'casa independiente' || t === 'casa en conjunto';
}

/** Traduce la columna "credito" (SI/NO/POR REVISAR) al texto que ve el visitante. */
function _formaPago(credito) {
  const c = (credito || '').trim().toLowerCase();
  if (!c) return '';
  if (c === 'si' || c === 'sí') return 'Si aplica crédito';
  if (c === 'no') return 'Solo al Contado';
  return 'Por revisar'; // cualquier otro valor, ej. "por revisar"
}

function _renderSimilares(inm) {
  const contenedor = document.getElementById('ficha-similares');
  if (!contenedor) return;

  // Solo mostramos similares para inmuebles en venta (con precio definido);
  // el rango de ±20M no aplica a cánones de arriendo.
  const precio = parseMoneda(inm.precio);
  if (!precio || !window._inventario) { contenedor.innerHTML = ''; return; }

  const RANGO = 20000000; // ±20 millones de pesos
  const candidatos = window._inventario.filter(i =>
    i !== inm &&
    i.tipo === inm.tipo &&
    parseMoneda(i.precio) > 0 &&
    Math.abs(parseMoneda(i.precio) - precio) <= RANGO
  );
  if (!candidatos.length) { contenedor.innerHTML = ''; return; }

  // Dos al azar entre los candidatos dentro del rango.
  const similares = _shuffle([...candidatos]).slice(0, 2);
  contenedor.innerHTML = `
    <p class="ficha-similares-title">Inmuebles similares</p>
    <div class="similares-row">
      ${similares.map(s => `
        <div class="similar-card" onclick="abrirFicha(${escHtml(JSON.stringify(s))})">
          ${s._img ? `<img class="similar-img" src="${escHtml(s._img)}" alt="${escHtml(s.tipo)}" loading="lazy" />` : ''}
          <div class="similar-info">
            <p class="similar-precio">${formatPrecio(parseMoneda(s.precio))}</p>
            <p class="similar-sub">${escHtml(s.tipo)} · ${escHtml(s.barrio)}</p>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ---- Mini lead desde la ficha ---- */
function _abrirMiniLead(inm, precioStr) {
  const modal = document.getElementById('mini-modal');
  document.getElementById('mini-modal-title').textContent = `${inm.tipo} en ${inm.barrio} — ${precioStr}`;
  modal.hidden = false;
  document.getElementById('mini-modal-overlay').hidden = false;
  document.getElementById('mini-modal-overlay').classList.add('active');
  modal.querySelector('#ml-nombre') && modal.querySelector('#ml-nombre').focus();
  modal.dataset.inm = JSON.stringify(inm);
}

function _cerrarMiniLead() {
  document.getElementById('mini-modal').hidden = true;
  document.getElementById('mini-modal-overlay').hidden = true;
  document.getElementById('mini-modal-overlay').classList.remove('active');
}

/* ---- Inicialización de eventos ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ficha-close')?.addEventListener('click', cerrarFicha);
  document.getElementById('ficha-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) cerrarFicha();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrarFicha(); _cerrarMiniLead(); } });

  document.getElementById('mini-modal-close')?.addEventListener('click', _cerrarMiniLead);
  document.getElementById('mini-modal-overlay')?.addEventListener('click', _cerrarMiniLead);

  document.getElementById('mini-lead-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inm     = JSON.parse(document.getElementById('mini-modal').dataset.inm || '{}');
    const nombre  = document.getElementById('ml-nombre').value.trim();
    const wa      = document.getElementById('ml-wa').value.trim();
    const credito = document.querySelector('input[name="ml-credito"]:checked')?.value || '';

    if (!nombre || !wa || !credito) { toast('Completa nombre, WhatsApp y forma de pago', 'warn'); return; }

    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Enviando…';

    const res = await enviarLead({ nombre, whatsapp: wa, credito, inmueble: inm.tipo + ' en ' + inm.barrio, precio: inm.precio }, 'ficha:' + (inm.id || ''));

    pixelLead('ficha');
    _cerrarMiniLead();

    // Abrir WhatsApp con nombre, forma de pago y link directo al inmueble
    const link = (window.CONFIG.BASE_URL || (window.location.origin + window.location.pathname)) + '?ver=' + _slugInmueble(inm);
    const msg  = `Hola, soy ${nombre}. Me interesa el ${inm.tipo} en ${inm.barrio}. Forma de pago: ${credito}. Enlace: ${link}`;
    window.open(waUrl(window.CONFIG.WHATSAPP_NUMBER, msg), '_blank');

    toast(res.ok ? '¡Mensaje enviado! Te contactaremos pronto.' : 'Enviado. Abriendo WhatsApp…', 'ok');
    btn.disabled = false; btn.textContent = 'Enviar y contactar por WhatsApp';
  });
});

/* =============================================================
 * DETECCIÓN DE ?ver= AL CARGAR LA PÁGINA
 * Si alguien llega con un link directo a un inmueble
 * (ej: catalogo.com?ver=apartamento-barrio-P0001),
 * el overlay se abre automáticamente con ese inmueble.
 *
 * También actualiza los og: tags con los datos del inmueble,
 * así el link compartido en WhatsApp o redes muestra la foto
 * y el precio correctos en la previsualización.
 * ============================================================= */

function abrirFichaPorUrl() {
  const ver = getParam('ver');
  if (!ver || !window._inventario || !window._inventario.length) return;

  // Extraer el ID del final del slug (ej: "apartamento-valle-del-lili-P0001" → "P0001")
  const partes = ver.split('-');
  const id     = partes[partes.length - 1].toUpperCase();

  // Buscar primero por ID exacto, luego por slug completo
  let inm = window._inventario.find(i => i.id && i.id.toUpperCase() === id);
  if (!inm) {
    // Fallback: buscar por similitud de tipo + barrio en el slug
    inm = window._inventario.find(i => {
      const slug = normTexto(`${i.tipo}-${i.barrio}-${i.id}`).replace(/\s+/g, '-');
      return slug.includes(normTexto(ver).replace(/\s+/g, '-'));
    });
  }
  if (!inm) return; // inmueble no encontrado (puede haber sido vendido)

  // Actualizar og: tags con datos reales del inmueble antes de abrir
  _actualizarOgInmueble(inm);
  abrirFicha(inm);
}

/**
 * Actualiza los meta og: tags con los datos del inmueble específico.
 * Esto hace que el link compartido muestre la foto y precio correctos.
 */
function _actualizarOgInmueble(inm) {
  const precio = parseMoneda(inm.precio) || parseMoneda(inm.canon);
  const precioStr = precio ? formatPrecio(precio) : '';
  const titulo  = `${inm.tipo} en ${inm.barrio}${precioStr ? ' — ' + precioStr : ''} | ${window.CONFIG.MARCA_NOMBRE}`;
  const desc    = inm.observaciones || `${inm.tipo} en ${inm.barrio}. ${inm.area ? inm.area + 'm². ' : ''}${inm.habitaciones ? inm.habitaciones + ' hab. ' : ''}${window.CONFIG.CIUDAD}.`;
  const img     = inm._img || inm.fotos || '';
  const url     = window.CONFIG.BASE_URL
                ? `${window.CONFIG.BASE_URL}?ver=${getParam('ver')}`
                : window.location.href;

  _metaTag('og:title',       titulo);
  _metaTag('og:description', desc);
  _metaTag('og:url',         url);
  if (img) _metaTag('og:image', img);
  document.title = titulo;
}

function _metaTag(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', prop);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Escuchar cuando el inventario esté listo para abrir la ficha
// (el inventario lo carga catalogo.js — necesitamos esperar a que termine)
document.addEventListener('inventarioListo', abrirFichaPorUrl);
