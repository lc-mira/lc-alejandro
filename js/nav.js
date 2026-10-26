/**
 * nav.js — NAVEGACIÓN Y MENÚ MÓVIL
 * ==================================
 * Hamburguesa, drawer, scroll suave, active links.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const toggle  = document.getElementById('menu-toggle');
  const drawer  = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');

  function abrirMenu() {
    drawer.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function cerrarMenu() {
    drawer.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', () => {
    drawer.getAttribute('aria-hidden') === 'false' ? cerrarMenu() : abrirMenu();
  });
  overlay?.addEventListener('click', cerrarMenu);

  // Cerrar al hacer clic en un enlace del drawer
  drawer?.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', cerrarMenu);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });
});
