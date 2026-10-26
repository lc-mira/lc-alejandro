/**
 * solicitudes.js — TABLERO DE REQUERIMIENTOS
 * ============================================
 * Lee la pestaña "Requerimientos" del espejo público
 * y muestra las solicitudes activas (sin datos de contacto del cliente).
 * Cada tarjeta tiene un botón "Tengo un inmueble" → WhatsApp del asesor.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('req-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Cargando solicitudes…</p></div>';

  try {
    const reqs = await cargarRequerimientos();
    if (!reqs.length) {
      grid.innerHTML = '<div class="empty-state"><p>No hay solicitudes activas en este momento.</p></div>';
      return;
    }
    grid.innerHTML = '';
    reqs.forEach(r => grid.appendChild(_crearReq(r)));
  } catch (e) {
    console.error('[solicitudes]', e);
    grid.innerHTML = '<div class="empty-state"><p>No se pudieron cargar las solicitudes.</p></div>';
  }
});

function _crearReq(r) {
  const presup  = r.presup   || r['presup']   || r.presupuesto || '';
  const tipo    = r.tipo     || '';
  const barrio  = r.barrio   || r.zona        || '';
  const pago    = r['forma_de_pago'] || r['forma_pago'] || r.entidad || '';
  const obs     = r.observacion || r.observaciones || '';
  const estado  = r.estado   || '';

  const cerrada = /cerrada|inactiva/i.test(estado);

  const card = document.createElement('div');
  card.className = 'req-card' + (cerrada ? ' cerrada' : '');
  card.innerHTML = `
    <div class="req-cab">
      <span class="req-tipo">${escHtml(tipo || 'Inmueble')}</span>
      ${presup ? `<span class="req-presup">${escHtml(presup)}</span>` : ''}
    </div>
    <div class="req-det">
      ${barrio    ? `<span>📍 <b>Zona:</b> ${escHtml(barrio)}</span>` : ''}
      ${pago      ? `<span class="req-pago">💳 ${escHtml(pago)}</span>` : ''}
    </div>
    ${obs ? `<div class="req-obs">"${escHtml(obs)}"</div>` : ''}
    ${!cerrada ? `
    <div class="req-acciones">
      <button class="btn btn--primary btn--sm" onclick="window.open('${_waMsgReq(tipo, barrio, presup, pago)}', '_blank'); pixelContact()">
        📩 Tengo un inmueble para esto
      </button>
      <button class="btn btn--outline btn--sm" onclick="navigator.clipboard.writeText('${_textoReq(tipo, barrio, presup, pago, obs)}').then(()=>toast('Copiado','ok'))">
        📋 Copiar
      </button>
    </div>` : `<p style="font-size:12px;color:var(--color-tenue);margin-top:8px">Solicitud cerrada</p>`}`;

  return card;
}

function _waMsgReq(tipo, barrio, presup, pago) {
  const num = String(window.CONFIG.WHATSAPP_NUMBER || '').replace(/\D+/g,'');
  const tel = num.startsWith('57') ? num : '57' + num;
  const msg = encodeURIComponent(`Hola, tengo un ${tipo||'inmueble'} en ${barrio||'la zona'} con presupuesto de ${presup||'consultar'}. ¿Está disponible aún?`);
  return `https://wa.me/${tel}?text=${msg}`;
}

function _textoReq(tipo, barrio, presup, pago, obs) {
  return `🏠 Requerimiento: ${tipo} en ${barrio}. Presupuesto: ${presup}. Pago: ${pago}. ${obs}`.trim();
}
