/**
 * seo.js — TAGS DINÁMICOS DE SEO Y OPEN GRAPH
 * =============================================
 * Actualiza el <title>, meta description, og: tags y canonical
 * con los datos reales del cliente usando CONFIG.BASE_URL.
 *
 * Esto asegura que las rutas nunca sean absolutas con
 * un nombre de repo hardcodeado (/catalogo/, /lc-alejandro/, etc.)
 * y funcionen igual con cualquier dominio o repo.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const C    = window.CONFIG;
  const base = (C.BASE_URL || '').replace(/\/$/, ''); // sin slash final
  const desc = `${C.MARCA_NOMBRE} — Apartamentos y casas en ${C.CIUDAD}. Catálogo actualizado con inventario real.`;

  // Meta tags de SEO
  _meta('description',    desc);
  _meta('og:title',       `Inmuebles en ${C.CIUDAD} | ${C.MARCA_NOMBRE}`);
  _meta('og:description', desc);
  _meta('og:url',         base || window.location.href);
  _meta('og:type',        'website');
  if (C.LOGO_URL) {
    // Ruta relativa → URL absoluta usando BASE_URL (sin hardcodear el nombre del repo)
    const imgUrl = C.LOGO_URL.startsWith('http')
      ? C.LOGO_URL
      : `${base}/${C.LOGO_URL.replace(/^\//, '')}`;
    _meta('og:image', imgUrl);
  }

  // Canonical — evita duplicados de indexación si hay varios dominios
  if (base) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', base + '/');
  }

  document.title = `Inmuebles en ${C.CIUDAD} | ${C.MARCA_NOMBRE}`;
});

function _meta(name, content) {
  const sel = name.startsWith('og:')
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:')) el.setAttribute('property', name);
    else el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
