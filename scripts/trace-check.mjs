#!/usr/bin/env node
/**
 * trace-check — verifica la cadena US → SPEC (R-/AC-) → ADR → tests → review.
 * Skill: .claude/skills/traceability-matrix/SKILL.md
 *
 * Uso:
 *   node scripts/trace-check.mjs           # verifica (exit 1 si hay errores)
 *   node scripts/trace-check.mjs --write   # además regenera docs/TRACEABILITY.md
 *
 * Sin dependencias externas: corre en CI y en cualquier máquina con Node ≥ 20.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const WRITE = process.argv.includes('--write');

const errors = [];
const warnings = [];

function walk(dir, filter, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.angular', '.git', 'playwright-report', 'test-results'].includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, filter, acc);
    else if (filter(full)) acc.push(full);
  }
  return acc;
}

const rel = (p) => relative(ROOT, p).replaceAll('\\', '/');

// 1. Specs ------------------------------------------------------------------
const specDir = join(ROOT, 'docs/specs');
const specFiles = walk(specDir, (f) => /SPEC-US-\d+\.md$/.test(f)).sort();
const adrFiles = walk(join(ROOT, 'docs/adrs'), (f) => /ADR-\d+.*\.md$/.test(f));
const adrIds = new Set(adrFiles.map((f) => f.match(/ADR-(\d+)/)[1]));

/** @type {Map<string, {spec:string, kind:string, tests:string[], findings:string[]}>} */
const ids = new Map();
const specs = [];

for (const file of specFiles) {
  const text = readFileSync(file, 'utf8');
  const specId = file.match(/(SPEC-US-\d+)/)[1];
  const status = (text.match(/Estado:\**\s*([^\n]+)/i)?.[1] ?? 'desconocido').replace(/[`*]/g, '').trim();
  const approved = /^aprobad/i.test(status);
  // Definiciones: IDs que aparecen al inicio de una fila de tabla o en un encabezado/escenario.
  const defRe = /(?:^\|\s*\**|^#+\s*|Scenario[^\n]*?|Escenario[^\n]*?)\**\s*`?((?:R|AC)-\d{2}\.\d+)`?/gim;
  const defined = new Set();
  for (const m of text.matchAll(defRe)) defined.add(m[1]);
  for (const id of defined) ids.set(id, { spec: specId, kind: id.startsWith('R-') ? 'Regla' : 'Criterio', tests: [], findings: [] });

  const adrRefs = [...text.matchAll(/ADR-(\d{3})/g)].map((m) => m[1]);
  if (adrRefs.length === 0) errors.push(`${specId}: no referencia ningún ADR.`);
  for (const a of new Set(adrRefs)) if (!adrIds.has(a)) errors.push(`${specId}: referencia ADR-${a} que no existe en docs/adrs/.`);
  if (defined.size === 0) warnings.push(`${specId}: no define IDs R-/AC- (¿spec aún sin migrar al formato v2?).`);

  specs.push({ specId, file: rel(file), status, approved, count: defined.size });
}

// 2. Tests ------------------------------------------------------------------
const frontendExists = existsSync(join(ROOT, 'frontend/package.json'));
const testFiles = walk(join(ROOT, 'frontend'), (f) => /\.spec\.ts$/.test(f));
const idInText = /\b((?:R|AC)-\d{2}\.\d+)\b/g;
for (const file of testFiles) {
  const text = readFileSync(file, 'utf8');
  const titleRe = /\b(?:it|test|describe)(?:\.\w+)?\(\s*(['"`])([\s\S]*?)\1/g;
  for (const m of text.matchAll(titleRe)) {
    for (const idm of m[2].matchAll(idInText)) {
      const entry = ids.get(idm[1]);
      if (entry && !entry.tests.includes(rel(file))) entry.tests.push(rel(file));
      if (!entry) warnings.push(`${rel(file)}: el test cita ${idm[1]}, que no está definido en ninguna spec.`);
    }
  }
}

// 3. Reviews ----------------------------------------------------------------
const reviewFiles = walk(join(ROOT, 'docs/reviews'), (f) => /REVIEW-(?!TEMPLATE).*\.md$/.test(f));
const findings = [];
for (const file of reviewFiles) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\|\s*\**(F-[\w]+\.\d+)\**\s*\|\s*`?(BLOCKER|MAJOR|MINOR)`?\s*\|(.*)$/);
    if (!m) continue;
    const cells = m[3].split('|').map((c) => c.trim()).filter(Boolean);
    const state = cells.at(-1) ?? '';
    const closed = /RESUELTO|ACEPTADO/i.test(state);
    findings.push({ id: m[1], severity: m[2], file: rel(file), state, closed });
    for (const idm of m[3].matchAll(idInText)) ids.get(idm[1])?.findings.push(m[1]);
    if (!closed && m[2] !== 'MINOR') errors.push(`${m[1]} (${m[2]}) en ${rel(file)} no está RESUELTO ni ACEPTADO.`);
  }
}

// 4. Reglas de cobertura -----------------------------------------------------
// Una spec está "en implementación" cuando al menos un test cita alguno de sus IDs.
// Desde ese momento se exige cobertura completa de esa spec (las historias se implementan una a una).
const specsInImplementation = new Set([...ids.values()].filter((e) => e.tests.length > 0).map((e) => e.spec));
for (const s of specs) s.inImplementation = specsInImplementation.has(s.specId);
for (const [id, e] of ids) {
  if (e.tests.length > 0) continue;
  const spec = specs.find((s) => s.specId === e.spec);
  const msg = `${id} (${e.spec}) no tiene ningún test que lo cite en su título.`;
  if (spec?.approved && frontendExists && spec.inImplementation) errors.push(msg);
  else warnings.push(msg);
}

// 5. Salida -----------------------------------------------------------------
if (WRITE) {
  const rows = [...ids.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([id, e]) => `| \`${id}\` | ${e.kind} | ${e.spec} | ${e.tests.map((t) => `\`${t}\``).join('<br>') || '—'} | ${e.findings.join(', ') || '—'} |`);
  const md = [
    '# Matriz de Trazabilidad',
    '',
    '> Generado por `node scripts/trace-check.mjs --write`. No editar a mano.',
    '',
    '## Specs',
    '| Spec | Estado | IDs definidos | En implementación |',
    '| :--- | :--- | :--- | :--- |',
    ...specs.map((s) => `| [${s.specId}](${s.file.replace('docs/', './')}) | ${s.status} | ${s.count} | ${s.inImplementation ? 'Sí' : 'No'} |`),
    '',
    '## Reglas y criterios → tests → hallazgos',
    '| ID | Tipo | Spec | Tests | Hallazgos |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...rows,
    '',
    '## Hallazgos de review',
    '| ID | Severidad | Reporte | Estado |',
    '| :--- | :--- | :--- | :--- |',
    ...findings.map((f) => `| ${f.id} | ${f.severity} | \`${f.file}\` | ${f.state} |`),
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'docs/TRACEABILITY.md'), md);
  console.log('✔ docs/TRACEABILITY.md regenerado');
}

console.log(`trace-check: ${specs.length} specs · ${ids.size} IDs · ${testFiles.length} archivos de test · ${findings.length} hallazgos`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const e of errors) console.error(`  ✖ ${e}`);
if (errors.length) {
  console.error(`trace-check FALLÓ con ${errors.length} error(es).`);
  process.exit(1);
}
console.log('trace-check OK');
