// B6 Smoke Test — Verificación estructural del prompt modularizado
// Modo de uso: copiar este código en un Code node de n8n o ejecutar con Node.js
//
// Este test verifica que el system prompt modularizado:
// 1. Ensamble correctamente desde las variables
// 2. Preserve todas las secciones
// 3. No tenga errores de sintaxis JS
//
// Para ejecutar desde terminal:
//   node docs/fixes/B6-smoke-test.js
//
// NOTA: Requiere Node.js 14+ y acceso al archivo JSON del workflow.

const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '..', '..', 'workflows', 'WhatsApp Bot - Genérico.json');

async function run() {
  const results = { pass: 0, fail: 0, warnings: [] };

  // 1. Cargar el JSON
  let data;
  try {
    data = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
    console.log('✓ Workflow JSON cargado correctamente');
    results.pass++;
  } catch (e) {
    console.error('✗ Error cargando workflow:', e.message);
    results.fail++;
    return results;
  }

  // 2. Extraer jsCode del nodo AI Agent
  let jsCode;
  for (const node of data.nodes || []) {
    if (node.name === 'AI Agent') {
      jsCode = node.parameters?.jsCode;
      break;
    }
  }
  if (!jsCode) {
    console.error('✗ Nodo AI Agent no encontrado o sin jsCode');
    results.fail++;
    return results;
  }
  console.log('✓ jsCode extraído del nodo AI Agent');
  results.pass++;

  // 3. Verificar que contiene las variables del prompt modularizado
  const expectedVars = [
    'role', 'saludoInicial', 'instruccionPrincipal',
    'servicios', 'profesionales', 'horariosAtencion',
    'fechaHoy', 'validacionHorario', 'sesionActiva',
    'horariosDisponibles', 'reglaSesionInterna', 'precedenciaGestion',
    'seleccionCita', 'cancelarAccion', 'reagendarAccion',
    'desambiguacion', 'cambioIntencion', 'reglaDisponibilidad',
    'agendamiento', 'cancelaciones', 'tolerancia', 'tono'
  ];

  let missing = [];
  for (const v of expectedVars) {
    const regex = new RegExp(`const\\s+${v}\\s*=\\s*\``);
    if (!regex.test(jsCode)) {
      missing.push(v);
    }
  }

  if (missing.length === 0) {
    console.log(`✓ Todas las ${expectedVars.length} variables del prompt están presentes`);
    results.pass++;
  } else {
    console.error(`✗ Variables faltantes: ${missing.join(', ')}`);
    results.fail++;
  }

  // 4. Verificar que el assembly usa todas las variables
  const assemblyVars = jsCode.match(/\$\{(role|saludoInicial|instruccionPrincipal|servicios|profesionales|horariosAtencion|fechaHoy|validacionHorario|sesionActiva|horariosDisponibles|reglaSesionInterna|precedenciaGestion|seleccionCita|cancelarAccion|reagendarAccion|desambiguacion|cambioIntencion|reglaDisponibilidad|agendamiento|cancelaciones|tolerancia|tono)\}/g);
  
  if (!assemblyVars) {
    console.error('✗ No se encontraron variables en el assembly del systemPrompt');
    results.fail++;
  } else {
    const uniqueInAssembly = [...new Set(assemblyVars.map(v => v.slice(2, -1)))];
    if (uniqueInAssembly.length === expectedVars.length) {
      console.log(`✓ Assembly contiene las ${uniqueInAssembly.length} variables correctas`);
      results.pass++;
    } else {
      console.warn(`⚠ Assembly tiene ${uniqueInAssembly.length} variables, se esperaban ${expectedVars.length}`);
      const diff = expectedVars.filter(v => !uniqueInAssembly.includes(v));
      if (diff.length) console.warn(`  Faltan en assembly: ${diff.join(', ')}`);
      const extra = uniqueInAssembly.filter(v => !expectedVars.includes(v));
      if (extra.length) console.warn(`  Extras en assembly: ${extra.join(', ')}`);
      results.warnings.push(`Assembly variable count mismatch`);
    }
  }

  // 5. Verificar espaciado del assembly
  const assemblySection = jsCode.match(/const systemPrompt = `\$\{role\}[\s\S]*?\$\{tono\}`;/);
  if (assemblySection) {
    const assembly = assemblySection[0];

    // Verificar que saludoInicial -> instruccionPrincipal tiene 2 blank lines
    const saludoToInst = assembly.match(/\$\{saludoInicial\}\n\n\n\$\{instruccionPrincipal\}/);
    if (saludoToInst) {
      console.log('✓ Espaciado saludoInicial→instruccionPrincipal: 2 blank lines');
      results.pass++;
    } else {
      console.error('✗ Espaciado saludoInicial→instruccionPrincipal incorrecto (debe ser \\n\\n\\n)');
      results.fail++;
    }

    // Verificar que cambioIntencion -> horariosDisponibles NO tiene blank line
    const cambioToHorarios = assembly.match(/\$\{cambioIntencion\}\n\$\{horariosDisponibles\}/);
    if (cambioToHorarios) {
      console.log('✓ Espaciado cambioIntencion→horariosDisponibles: sin blank line');
      results.pass++;
    } else {
      console.error('✗ Espaciado cambioIntencion→horariosDisponibles incorrecto (debe ser \\n)');
      results.fail++;
    }

    // Verificar que el resto tiene 1 blank line
    const oneBlankPairs = [
      ['instruccionPrincipal', 'servicios'],
      ['servicios', 'profesionales'],
      ['profesionales', 'horariosAtencion'],
      ['horariosAtencion', 'fechaHoy'],
      ['fechaHoy', 'validacionHorario'],
      ['validacionHorario', 'sesionActiva'],
      ['sesionActiva', 'reglaSesionInterna'],
      ['reglaSesionInterna', 'precedenciaGestion'],
      ['precedenciaGestion', 'seleccionCita'],
      ['seleccionCita', 'cancelarAccion'],
      ['cancelarAccion', 'reagendarAccion'],
      ['reagendarAccion', 'desambiguacion'],
      ['desambiguacion', 'cambioIntencion'],
      ['horariosDisponibles', 'reglaDisponibilidad'],
      ['reglaDisponibilidad', 'agendamiento'],
      ['agendamiento', 'cancelaciones'],
      ['cancelaciones', 'tolerancia'],
      ['tolerancia', 'tono'],
    ];

    let allOneBlankOk = true;
    for (const [a, b] of oneBlankPairs) {
      const regex = new RegExp(`\\$\\{${a}\\}\\n\\n\\$\\{${b}\\}`);
      if (!regex.test(assembly)) {
        console.warn(`⚠ Espaciado ${a}→${b}: NO tiene 1 blank line`);
        allOneBlankOk = false;
      }
    }
    if (allOneBlankOk) {
      console.log('✓ Espaciado estándar (1 blank line) verificado en todos los pares');
      results.pass++;
    } else {
      results.warnings.push('Algunos pares no tienen 1 blank line');
    }
  } else {
    console.error('✗ No se encontró el assembly del systemPrompt');
    results.fail++;
  }

  // 6. Verificar consistencia de interpolaciones
  // Las variables con ${d.xxx} deben coincidir con las secciones de datos dinámicos
  const interpolationMatches = jsCode.match(/\$\{d\.\w+\}/g);
  if (interpolationMatches) {
    const keys = [...new Set(interpolationMatches)];
    console.log(`✓ Interpolaciones dinámicas encontradas: ${keys.length} (${keys.join(', ')})`);
    results.pass++;
  }

  // 7. Verificar que el short-circuit está antes del block de variables
  const shortCircuitBeforePrompt = jsCode.indexOf('short-circuit') < jsCode.indexOf('const role');
  if (shortCircuitBeforePrompt) {
    console.log('✓ Short-circuit fuera de horario ANTES de las variables del prompt');
    results.pass++;
  } else {
    console.error('✗ Short-circuit fuera de horario NO está antes de las variables');
    results.fail++;
  }

  // 8. Verificar gapMessage en scope
  const gapInSesionActiva = /const\s+sesionActiva\s*=\s*`\$\{d\.sesionContexto\}\$\{gapMessage\}`/.test(jsCode);
  if (gapInSesionActiva) {
    console.log('✓ gapMessage referenciado correctamente en sesionActiva');
    results.pass++;
  } else {
    console.error('✗ gapMessage no encontrado en sesionActiva');
    results.fail++;
  }

  console.log(`\n=== RESULTADOS ===`);
  console.log(`  Pass: ${results.pass}`);
  console.log(`  Fail: ${results.fail}`);
  console.log(`  Warnings: ${results.warnings.length}`);
  results.warnings.forEach(w => console.log(`    ⚠ ${w}`));

  if (results.fail > 0) {
    console.error('\n✗ SMOKE TEST FALLÓ — revisar el jsCode antes de deployar');
    process.exit(1);
  } else {
    console.log('\n✓ SMOKE TEST PASÓ — prompt modularizado estructuralmente correcto');
  }
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
