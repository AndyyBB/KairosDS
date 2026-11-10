// Hito 5 (Sprint 4): PRUEBAS DE RENDIMIENTO Y CARGA del Sistema de Control de Ingreso.
//
// Simula varios usuarios trabajando a la vez contra la API de Kairos y mide los tiempos
// de respuesta (promedio, p50, p95, p99), las peticiones por segundo y los errores.
// Solo hace CONSULTAS: no registra, no edita ni elimina datos.
//
// Uso (desde la carpeta kairos-bd, con el backend encendido):
//   node pruebas/rendimiento/prueba-carga.mjs
//
// Variables opcionales (se pueden escribir antes del comando):
//   KAIROS_API        URL de la API              (por defecto http://localhost:8000/api)
//   KAIROS_CORREO     correo de un usuario administrador (si no se indica, se pregunta)
//   KAIROS_PASSWORD   su contraseña                       (si no se indica, se pregunta)
//   KAIROS_USUARIOS   usuarios simultáneos por etapa (por defecto 1,10,25,50)
//   KAIROS_SEGUNDOS   duración de cada etapa en segundos (por defecto 20)
//   KAIROS_EXAMEN_ID  examen de HOY para probar "Verificar" del control de ingreso (opcional)
//   KAIROS_CODIGO     código de un estudiante HABILITADO en ese examen (opcional)
//
// Al terminar guarda el informe en pruebas/rendimiento/resultados/ (Markdown y JSON).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const API = (process.env.KAIROS_API || 'http://localhost:8000/api').replace(/\/$/, '');
const ETAPAS = (process.env.KAIROS_USUARIOS || '1,10,25,50').split(',').map((n) => Number(n.trim())).filter((n) => n > 0);
const SEGUNDOS = Number(process.env.KAIROS_SEGUNDOS || 20);
const EXAMEN_ID = process.env.KAIROS_EXAMEN_ID || '';
const CODIGO = process.env.KAIROS_CODIGO || '';

// Criterios de aceptacion de rendimiento (HU-10: resultado de la verificacion en maximo 3 s).
const LIMITE_P95_MS = { verificar: 3000, otros: 2000 };
const LIMITE_ERRORES = 0.01; // 1 %

async function preguntar(texto) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const r = await rl.question(texto);
  rl.close();
  return r.trim();
}

async function iniciarSesion() {
  const correo = process.env.KAIROS_CORREO || (await preguntar('Correo del usuario administrador: '));
  const password = process.env.KAIROS_PASSWORD || (await preguntar('Contraseña: '));
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ correo_electronico: correo, password }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo iniciar sesión (${res.status}). Revisa el correo, la contraseña y que el backend esté encendido.`);
  }
  return (await res.json()).token;
}

// Escenarios: consultas que se usan durante un examen masivo.
function escenarios() {
  const lista = [
    { id: 'me', nombre: 'Sesión (GET /me)', metodo: 'GET', ruta: '/me' },
    { id: 'estudiantes', nombre: 'Buscar estudiantes', metodo: 'GET', ruta: '/estudiantes?buscar=20&per_page=20' },
    { id: 'examenes', nombre: 'Lista de exámenes', metodo: 'GET', ruta: '/examenes?per_page=20' },
    { id: 'examenes_hoy', nombre: 'Exámenes de hoy (control de ingreso)', metodo: 'GET', ruta: '/control-ingreso/examenes' },
    { id: 'reporte', nombre: 'Reporte de estudiantes registrados', metodo: 'GET', ruta: '/reportes/registrados' },
  ];
  if (EXAMEN_ID && CODIGO) {
    lista.push({
      id: 'verificar',
      nombre: 'Verificar identidad (control de ingreso)',
      metodo: 'POST',
      ruta: '/control-ingreso/verificar',
      cuerpo: { examen_id: Number(EXAMEN_ID), metodo: 'codigo', valor: CODIGO },
    });
  }
  return lista;
}

function percentil(ordenados, p) {
  if (!ordenados.length) return 0;
  const i = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, i)];
}

async function peticion(token, e) {
  const inicio = performance.now();
  try {
    const res = await fetch(API + e.ruta, {
      method: e.metodo,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(e.cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: e.cuerpo ? JSON.stringify(e.cuerpo) : undefined,
    });
    await res.arrayBuffer();
    return { ms: performance.now() - inicio, ok: res.status < 500 && res.status !== 401 && res.status !== 403, estado: res.status };
  } catch {
    return { ms: performance.now() - inicio, ok: false, estado: 0 };
  }
}

// Una etapa: N usuarios virtuales repiten los escenarios durante SEGUNDOS.
async function etapa(token, usuarios, lista) {
  const datos = Object.fromEntries(lista.map((e) => [e.id, { tiempos: [], errores: 0, estados: {} }]));
  const fin = Date.now() + SEGUNDOS * 1000;
  const inicio = Date.now();

  async function usuarioVirtual(n) {
    let k = n;
    while (Date.now() < fin) {
      const e = lista[k % lista.length];
      k += 1;
      const r = await peticion(token, e);
      const d = datos[e.id];
      d.tiempos.push(r.ms);
      d.estados[r.estado] = (d.estados[r.estado] || 0) + 1;
      if (!r.ok) d.errores += 1;
    }
  }

  await Promise.all(Array.from({ length: usuarios }, (_, n) => usuarioVirtual(n)));
  const duracion = (Date.now() - inicio) / 1000;

  return lista.map((e) => {
    const d = datos[e.id];
    const t = [...d.tiempos].sort((a, b) => a - b);
    const total = t.length;
    const promedio = total ? t.reduce((a, b) => a + b, 0) / total : 0;
    const p95 = percentil(t, 95);
    const limite = e.id === 'verificar' ? LIMITE_P95_MS.verificar : LIMITE_P95_MS.otros;
    const tasaErrores = total ? d.errores / total : 0;
    return {
      escenario: e.nombre,
      id: e.id,
      usuarios,
      peticiones: total,
      por_segundo: total / duracion,
      promedio_ms: promedio,
      p50_ms: percentil(t, 50),
      p95_ms: p95,
      p99_ms: percentil(t, 99),
      max_ms: t[total - 1] ?? 0,
      errores: d.errores,
      tasa_errores: tasaErrores,
      estados: d.estados,
      limite_p95_ms: limite,
      cumple: total > 0 && p95 <= limite && tasaErrores <= LIMITE_ERRORES,
    };
  });
}

const f0 = (n) => Math.round(n).toLocaleString('es-BO');
const f1 = (n) => n.toLocaleString('es-BO', { maximumFractionDigits: 1 });

function informeMarkdown(resultados, fecha) {
  const filas = resultados
    .map(
      (r) =>
        `| ${r.usuarios} | ${r.escenario} | ${f0(r.peticiones)} | ${f1(r.por_segundo)} | ${f0(r.promedio_ms)} | ${f0(r.p50_ms)} | ${f0(r.p95_ms)} | ${f0(r.p99_ms)} | ${f0(r.max_ms)} | ${f1(r.tasa_errores * 100)} % | ${r.cumple ? 'Cumple' : 'NO cumple'} |`
    )
    .join('\n');
  const fallas = resultados.filter((r) => !r.cumple);
  return `# Informe de pruebas de rendimiento y carga — Kairos Digital Systems

- Fecha: ${fecha.toLocaleString('es-BO')}
- API probada: ${API}
- Usuarios simultáneos por etapa: ${ETAPAS.join(', ')}
- Duración de cada etapa: ${SEGUNDOS} s
- Criterios: tiempo p95 ≤ ${LIMITE_P95_MS.verificar / 1000} s en "Verificar identidad" (HU-10), p95 ≤ ${LIMITE_P95_MS.otros / 1000} s en las demás consultas y errores ≤ ${LIMITE_ERRORES * 100} %.
${EXAMEN_ID && CODIGO ? '' : '- Nota: no se probó "Verificar identidad" (faltan KAIROS_EXAMEN_ID y KAIROS_CODIGO).\n'}
## Resultados

| Usuarios | Escenario | Peticiones | Pet./s | Promedio (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) | Errores | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|
${filas}

## Conclusión

${fallas.length === 0 ? 'Todos los escenarios cumplen los criterios de rendimiento en todas las etapas.' : `No cumplen los criterios: ${fallas.map((r) => `${r.escenario} con ${r.usuarios} usuarios (p95 ${f0(r.p95_ms)} ms, errores ${f1(r.tasa_errores * 100)} %)`).join('; ')}.`}

> Importante: "php artisan serve" atiende una petición a la vez. Con muchos usuarios simultáneos los
> tiempos suben por eso, no por el código. En el servidor final se recomienda Apache o Nginx con
> PHP-FPM (varios procesos) y repetir esta prueba.
`;
}

async function main() {
  console.log(`\nPrueba de carga de Kairos — API: ${API}\n`);
  const token = await iniciarSesion();
  const lista = escenarios();
  const resultados = [];
  for (const usuarios of ETAPAS) {
    process.stdout.write(`Etapa con ${usuarios} usuario(s) simultáneo(s) durante ${SEGUNDOS} s... `);
    const r = await etapa(token, usuarios, lista);
    resultados.push(...r);
    console.log('listo');
    console.table(
      r.map((x) => ({
        Escenario: x.escenario,
        Peticiones: x.peticiones,
        'Pet./s': Number(x.por_segundo.toFixed(1)),
        'Prom. ms': Math.round(x.promedio_ms),
        'p95 ms': Math.round(x.p95_ms),
        Errores: x.errores,
        Resultado: x.cumple ? 'Cumple' : 'NO cumple',
      }))
    );
  }

  // Se cierra la sesion de la prueba.
  await fetch(`${API}/logout`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }).catch(() => {});

  const fecha = new Date();
  const sello = fecha.toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'resultados');
  fs.mkdirSync(carpeta, { recursive: true });
  const md = path.join(carpeta, `informe-${sello}.md`);
  fs.writeFileSync(md, informeMarkdown(resultados, fecha), 'utf8');
  fs.writeFileSync(path.join(carpeta, `informe-${sello}.json`), JSON.stringify({ api: API, etapas: ETAPAS, segundos: SEGUNDOS, resultados }, null, 2), 'utf8');
  console.log(`\nInforme guardado en: ${md}\n`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}\n`);
  process.exit(1);
});
