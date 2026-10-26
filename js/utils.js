/**
 * utils.js — HELPERS COMPARTIDOS
 * =================================
 * Funciones puras reutilizables por todos los módulos.
 * No tiene dependencias ni efectos secundarios.
 */

'use strict';

/* ---- Parsear dinero con formato colombiano ("$165.000.000 COP" → 165000000) ----
 * La API de Sheets devuelve los valores ya formateados (FORMATTED_VALUE), así que
 * parseFloat() directo falla (se detiene en el "$"). Hay que limpiar todo lo que
 * no sea dígito antes de convertir. */
function parseMoneda(valor) {
  const limpio = String(valor || '').replace(/[^\d]/g, '');
  return limpio ? parseInt(limpio, 10) : 0;
}

/* ---- Formateo de dinero ---- */
function formatPrecio(valor) {
  if (!valor || isNaN(valor)) return '';
  const m = valor / 1e6;
  if (m >= 1000) return '$' + (m / 1000).toFixed(2).replace(/\.?0+$/, '') + ' B';
  if (m % 1 === 0) return '$' + m + ' M';
  return '$' + m.toFixed(1) + ' M';
}

function formatCifra(n) {
  // → "$ 1.250.000"
  return '$ ' + Number(n).toLocaleString('es-CO');
}

/* ---- Normalizar texto (para búsqueda) ---- */
function normTexto(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* ---- Limpiar número de teléfono ---- */
function limpiarTel(t) {
  return String(t || '').replace(/\D+/g, '').replace(/^57/, '');
}

/* ---- Obtener parámetros de la URL ---- */
function getParam(clave) {
  return new URLSearchParams(window.location.search).get(clave) || '';
}

function setParams(obj) {
  const p = new URLSearchParams(window.location.search);
  Object.entries(obj).forEach(([k, v]) => {
    if (v) p.set(k, v); else p.delete(k);
  });
  const base = window.location.pathname;
  const nuevo = p.toString() ? base + '?' + p.toString() : base;
  history.replaceState(null, '', nuevo);
}

/* ---- Debounce ---- */
function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ---- Escapar HTML (prevenir XSS) ---- */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- Construir URL de WhatsApp ---- */
function waUrl(numero, mensaje) {
  const tel = String(numero).replace(/\D+/g, '');
  const num = tel.startsWith('57') ? tel : '57' + tel;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

/* ---- Toast (Toastify wrapper) ---- */
function toast(mensaje, tipo = 'info') {
  const colores = {
    ok:    { background: '#15803d' },
    error: { background: '#b4232a' },
    info:  { background: '#1c2430' },
    warn:  { background: '#a16207' },
  };
  if (window.Toastify) {
    Toastify({
      text: mensaje,
      duration: 3200,
      gravity: 'bottom', position: 'center',
      style: colores[tipo] || colores.info,
      stopOnFocus: true,
    }).showToast();
  }
}

/* ---- Detectar móvil ---- */
const esMobil = () => window.innerWidth < 768;
