/**
 * calculadora.js — CALCULADORA DE CRÉDITO HIPOTECARIO
 * =====================================================
 * Sistema francés de amortización.
 * Detecta VIS/VIP según SMMLV vigente.
 *
 * MANTENIMIENTO ANUAL (cada enero):
 *   - Actualiza SMMLV_VIGENTE con el nuevo salario mínimo.
 *   - Revisa las tasas por defecto (TASA_VIS, TASA_NO_VIS).
 */

'use strict';

/* ---- Constantes actualizables ---- */
const SMMLV_VIGENTE = 1_423_500;  // ← SMMLV 2026 (actualizar cada enero)
const TASA_VIS      = 12.5;       // % EA referencia VIS 2026
const TASA_NO_VIS   = 14.0;       // % EA referencia No VIS 2026
const LIM_VIS_SMMLV = 150;        // tope VIS en SMMLV (Ley 546)
const CUOTA_INGRESO_VIS    = 0.40; // 40% relación cuota/ingreso VIS
const CUOTA_INGRESO_NO_VIS = 0.30; // 30% relación cuota/ingreso No VIS

document.addEventListener('DOMContentLoaded', () => {
  const cont = document.getElementById('calculadora-widget');
  if (!cont) return;

  // Precargado desde la URL (?valor=200000000)
  const valorURL = parseInt(getParam('valor')) || '';

  cont.innerHTML = `
    <div class="calc-widget">
      <div class="calc-row">
        <div class="calc-group">
          <label class="calc-label" for="c-valor">Valor del inmueble (COP)</label>
          <input class="calc-input" id="c-valor" type="number" placeholder="Ej: 250000000"
            value="${valorURL}" min="0" step="1000000" inputmode="numeric" />
          <span class="calc-hint">En pesos colombianos</span>
        </div>
        <div class="calc-group">
          <label class="calc-label" for="c-cuota-ini">Cuota inicial (%)</label>
          <input class="calc-input" id="c-cuota-ini" type="number" value="30" min="0" max="99" step="1" />
          <span class="calc-hint">Mín. 30% No VIS · 20% VIS</span>
        </div>
      </div>
      <div class="calc-row">
        <div class="calc-group">
          <label class="calc-label" for="c-plazo">Plazo (años)</label>
          <input class="calc-input" id="c-plazo" type="number" value="15" min="1" max="30" step="1" />
        </div>
        <div class="calc-group">
          <label class="calc-label" for="c-tasa">Tasa de interés EA (%)</label>
          <input class="calc-input" id="c-tasa" type="number" value="${TASA_NO_VIS}" min="0" max="50" step="0.1" />
          <span class="calc-hint">Varía por entidad y perfil crediticio</span>
        </div>
      </div>
      <div class="calc-row">
        <div class="calc-group">
          <label class="calc-label" for="c-tipo-emp">Tipo de empleo</label>
          <select class="calc-input" id="c-tipo-emp">
            <option value="empleado">Empleado</option>
            <option value="independiente">Independiente</option>
          </select>
        </div>
        <div class="calc-group" style="align-items:flex-end">
          <button class="btn btn--primary" id="btn-calcular" onclick="calcularCredito()">
            Calcular cuota estimada
          </button>
        </div>
      </div>
      <div class="calc-resultado" id="calc-resultado"></div>
      <p class="calc-aviso">* Cálculo estimado con fines informativos. Las tasas reales varían por entidad y perfil. Consulta con tu banco o asesor financiero.</p>
    </div>`;

  // Si viene con valor desde la URL, calcular automáticamente
  if (valorURL) { setTimeout(calcularCredito, 100); }

  // Detectar VIS y ajustar tasa sugerida al cambiar el valor
  document.getElementById('c-valor')?.addEventListener('input', () => {
    const v = parseFloat(document.getElementById('c-valor').value) || 0;
    const esVIS = v <= SMMLV_VIGENTE * LIM_VIS_SMMLV;
    document.getElementById('c-tasa').value = esVIS ? TASA_VIS : TASA_NO_VIS;
  });
});

function calcularCredito() {
  const valor    = parseFloat(document.getElementById('c-valor')?.value)    || 0;
  const pctIni   = parseFloat(document.getElementById('c-cuota-ini')?.value) || 30;
  const plazoAn  = parseInt(document.getElementById('c-plazo')?.value)       || 15;
  const tasaEA   = parseFloat(document.getElementById('c-tasa')?.value)      || TASA_NO_VIS;
  const empleo   = document.getElementById('c-tipo-emp')?.value || 'empleado';
  const resEl    = document.getElementById('calc-resultado');

  if (!valor || valor < 1_000_000) { toast('Ingresa un valor válido', 'warn'); return; }

  const cuotaIni = valor * (pctIni / 100);
  const montoCred = valor - cuotaIni;
  const tasaMens  = Math.pow(1 + tasaEA / 100, 1/12) - 1;
  const n         = plazoAn * 12;
  const cuota     = montoCred * (tasaMens * Math.pow(1+tasaMens, n)) / (Math.pow(1+tasaMens, n) - 1);

  const esVIS      = valor <= SMMLV_VIGENTE * LIM_VIS_SMMLV;
  const pctIngresos = esVIS ? CUOTA_INGRESO_VIS : CUOTA_INGRESO_NO_VIS;
  const ingrMinimo = cuota / pctIngresos;
  const cumpleLey  = cuota <= ingrMinimo * pctIngresos; // siempre true — para mostrar la relación

  const docs = empleo === 'empleado' ? [
    'Cédula de ciudadanía','Últimas 3 colillas de pago',
    'Certificación laboral con salario','Extractos bancarios 3 meses',
    'Declaración de renta (si aplica)',
  ] : [
    'Cédula de ciudadanía','Cámara de comercio o RUT',
    'Extractos bancarios últimos 6 meses','Declaración de renta últimos 2 años',
    'Estados financieros recientes (si aplica)',
  ];

  resEl.className = 'calc-resultado visible';
  resEl.innerHTML = `
    <p class="calc-cuota">${formatCifra(Math.round(cuota))}</p>
    <p class="calc-cuota-label">Cuota mensual estimada · ${n} cuotas · ${tasaEA}% EA</p>
    <div class="calc-grid">
      <div><p class="calc-item-label">Valor del inmueble</p><p class="calc-item-val">${formatCifra(valor)}</p></div>
      <div><p class="calc-item-label">Cuota inicial (${pctIni}%)</p><p class="calc-item-val">${formatCifra(Math.round(cuotaIni))}</p></div>
      <div><p class="calc-item-label">Monto del crédito</p><p class="calc-item-val">${formatCifra(Math.round(montoCred))}</p></div>
      <div><p class="calc-item-label">Ingreso mínimo requerido</p><p class="calc-item-val ${ingrMinimo > 0 ? 'calc-warn' : ''}">${formatCifra(Math.round(ingrMinimo))}</p></div>
      <div><p class="calc-item-label">Segmento</p><p class="calc-item-val">${esVIS ? 'VIS (≤ 150 SMMLV)' : 'No VIS'}</p></div>
      <div><p class="calc-item-label">Relación cuota/ingreso</p><p class="calc-item-val calc-ok">${(pctIngresos*100).toFixed(0)}% según ley</p></div>
    </div>
    <div class="calc-docs">
      <p class="calc-docs-title">Documentos que pedirá el banco (${empleo})</p>
      <ul>${docs.map(d=>`<li>${escHtml(d)}</li>`).join('')}</ul>
    </div>`;

  pixelCalculadora();
}
