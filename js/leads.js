/**
 * leads.js — FORMULARIO PRINCIPAL "AYÚDAME A ENCONTRAR"
 * =======================================================
 * Sección #consulta — formulario largo de calificación.
 * El mini-lead de la ficha está en ficha.js.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lead-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpiar errores previos
    form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const nombre = document.getElementById('lf-nombre').value.trim();
    const wa     = document.getElementById('lf-wa').value.trim();
    const tipo   = document.getElementById('lf-tipo').value;
    const presup = document.getElementById('lf-presup').value;
    const zona   = document.getElementById('lf-zona').value.trim();
    const pago   = document.querySelector('input[name="pago"]:checked')?.value || '';
    const obs    = document.getElementById('lf-obs').value.trim();

    // Validación básica
    let valid = true;
    if (!nombre) { _marcarError('lf-nombre', 'El nombre es obligatorio'); valid = false; }
    if (!wa || !/\d{7,}/.test(wa.replace(/\D/g,''))) { _marcarError('lf-wa', 'Ingresa un número válido'); valid = false; }
    if (!valid) return;

    const btn = form.querySelector('#btn-lead-submit');
    btn.disabled = true; btn.textContent = 'Enviando…';

    const res = await enviarLead({ nombre, whatsapp: limpiarTel(wa), tipo, presupuesto: presup, zona, forma_pago: pago, observaciones: obs }, 'consulta');

    pixelLead('consulta');

    if (res.ok) {
      form.reset();
      toast('¡Solicitud enviada! Te contactaremos pronto 🎉', 'ok');
      // Abrir WhatsApp con resumen
      const msg = `Hola, completé el formulario del catálogo. Busco: ${tipo||'inmueble'} en ${zona||'la ciudad'}, presupuesto: ${presup||'a consultar'}. Forma de pago: ${pago||'por definir'}.`;
      setTimeout(() => window.open(waUrl(window.CONFIG.WHATSAPP_NUMBER, msg), '_blank'), 800);
    } else {
      toast(res.mensaje || 'Ocurrió un error. Intenta de nuevo.', 'error');
    }

    btn.disabled = false; btn.textContent = 'Enviar solicitud';
  });
});

function _marcarError(inputId, msg) {
  const group = document.getElementById(inputId)?.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  let errEl = group.querySelector('.form-error-msg');
  if (!errEl) { errEl = document.createElement('span'); errEl.className = 'form-error-msg'; group.appendChild(errEl); }
  errEl.textContent = msg;
}
