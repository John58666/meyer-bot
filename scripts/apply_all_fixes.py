#!/usr/bin/env python3
"""Re-apply B7 + B9 + B10 + fix scope bug in disponibilidadCompleta"""
import json, shutil
from pathlib import Path

wf = Path('/Users/johnanderprietogarzon/Documents/meyer-bot/workflows/WhatsApp Bot - Genérico.json')
bak = wf.with_suffix('.bak.json')

# Restore backup first
shutil.copy2(bak, wf)

with open(wf, 'r', encoding='utf-8') as f:
    data = json.load(f)

nodes = data['nodes']

# ═══ NODE [6] Formatear Disponibilidad ═══
c6 = nodes[6]['parameters']['jsCode']

# 0. B7: Replace $input.all() with explicit node reference (n8n 2.10.3 bug)
c6 = c6.replace('$input.all()', '$("Leer Slots Disponibles").all()')

# 1. B7: Remove a.m./p.m. conversion
c6 = c6.replace(".replace(/AM/g, 'a.m.').replace(/PM/g, 'p.m.')", "")

# 2. B7: Add disponibilidadCompleta declaration
c6 = c6.replace(
    "let disponibilidad = '';",
    "let disponibilidad = '';\nlet disponibilidadCompleta = '';"
)

# 3. B7: Add date header to disponibilidadCompleta (same indent as disponibilidad)
c6 = c6.replace(
    "  disponibilidad += `\U0001f4c5 ${fechaLabel}:\\n`;",
    "  disponibilidad += `\U0001f4c5 ${fechaLabel}:\\n`;\n  disponibilidadCompleta += `\U0001f4c5 ${fechaLabel}:\\n`;"
)

# 4. Add todas + disponibilidadCompleta inside inner for (correct scope, 4-space indent)
old_last_line = "    disponibilidad += `\U0001f464 ${prof}: \U0001f7e2 ${linea}\\n`;\n  }"
new_last_lines = (
    "    disponibilidad += `\U0001f464 ${prof}: \U0001f7e2 ${linea}\\n`;\n"
    "    const todas = horasFormateadas.join(', ');\n"
    "    disponibilidadCompleta += `\U0001f464 ${prof}: \U0001f7e2 ${todas}\\n`;\n"
    "  }"
)
assert old_last_line in c6, "ERROR: old last line not found in inner for!"
c6 = c6.replace(old_last_line, new_last_lines)

# 5. Add disponibilidadCompleta to return
c6 = c6.replace(
    "disponibilidad: disponibilidad || 'Sin disponibilidad en los pr\u00f3ximos 7 d\u00edas',",
    "disponibilidad: disponibilidad || 'Sin disponibilidad en los pr\u00f3ximos 7 d\u00edas',\n    disponibilidadCompleta,"
)

nodes[6]['parameters']['jsCode'] = c6
print("NODE [6]: B7 AM/PM + disponibilidadCompleta + scope fix")

# ═══ NODE [33] AI Agent ═══
c33 = nodes[33]['parameters']['jsCode']

# FIX: Remove dangling `const systemPrompt =` (remanente de B6 que causa SyntaxError)
c33_lines = c33.split('\n')
for i, line in enumerate(c33_lines):
    if line.strip() == 'const systemPrompt =':
        for j in range(i+1, min(i+5, len(c33_lines))):
            if 'const systemPrompt =' in c33_lines[j]:
                c33_lines.pop(i)
                if i > 0 and c33_lines[i-1].strip().startswith('// \u2500\u2500 1. SYSTEM PROMPT \u2500\u2500'):
                    c33_lines.pop(i-1)
                break
        break
c33 = '\n'.join(c33_lines)

# B7 part 2: HORARIOS COMPLETOS + mas horarios rule
old_h7 = (
    "const horariosDisponibles = `HORARIOS DISPONIBLES (pr\u00f3ximos 7 d\u00edas):\n"
    "${d.disponibilidad}\n"
    "\n"
    "REGLAS ESTRICTAS DE DISPONIBILIDAD:\n"
    "- SOLO puedes ofrecer d\u00edas y horas que aparezcan EXACTAMENTE en HORARIOS DISPONIBLES arriba. Si un d\u00eda u hora no est\u00e1 en esa lista, no existe para ti. NUNCA inventes horarios ni asumas que un horario est\u00e1 disponible si no ves el d\u00eda y hora exactos en la lista.`;"
)
new_h7 = (
    "const horariosDisponibles = `HORARIOS DISPONIBLES (pr\u00f3ximos 7 d\u00edas):\n"
    "${d.disponibilidad}\n"
    "\n"
    "HORARIOS COMPLETOS (sin l\u00edmite):\n"
    "${d.disponibilidadCompleta || d.disponibilidad}\n"
    "\n"
    "REGLAS ESTRICTAS DE DISPONIBILIDAD:\n"
    "- SOLO puedes ofrecer d\u00edas y horas que aparezcan EXACTAMENTE en HORARIOS DISPONIBLES arriba. Si un d\u00eda u hora no est\u00e1 en esa lista, no existe para ti. NUNCA inventes horarios ni asumas que un horario est\u00e1 disponible si no ves el d\u00eda y hora exactos en la lista.\n"
    "- INSTRUCCI\u00d3N \"M\u00c1S HORARIOS\": Si el cliente pregunta \"m\u00e1s horarios\", \"ver m\u00e1s\", \"m\u00e1s opciones\", \"qu\u00e9 m\u00e1s hay\", \"hay m\u00e1s\" o similar \u2192 muestra los horarios adicionales que aparecen en HORARIOS COMPLETOS pero NO en HORARIOS DISPONIBLES. Usa el mismo formato con \U0001f7e2.`;"
)
assert old_h7 in c33, "ERROR: horariosDisponibles block not found!"
c33 = c33.replace(old_h7, new_h7)
print("NODE [33]: B7 part 2 - HORARIOS COMPLETOS + M\u00c1S HORARIOS")

# B9: Fix voseo
c33 = c33.replace("recomend\u00e1s", "recomiendas")
c33 = c33.replace("Quer\u00e9s", "Quieres")
print("NODE [33]: B9 - Voseo fixes")

# B9 + B10: Replace tono section
idx_start = c33.index("const tono = `TONO Y LENGUAJE:")
idx_end = c33.index("`;", idx_start) + 2

new_tono = """const tono = `TONO Y LENGUAJE:
- Responde SIEMPRE en espa\u00f1ol colombiano neutro (usa \"t\u00fa\" no \"vos\"). Evita modismos argentinos como \"che\", \"vos\", \"sab\u00e9s\", \"ten\u00e9s\", \"quer\u00e9s\", \"pod\u00e9s\".
- Acepta y entiende jerga colombiana: parce, loca, marica, mi amor, papi, mami, listo pues, hagale, le doy, ch\u00e9vere, bacano, pilas, buena, perro, pana, pa, sisa, sisas, breves, qu\u00e9 m\u00e1s, entre otros. Nunca te ofendas ni corrijas al cliente.
- Responde con calidez y naturalidad, como si fuera una persona real del negocio
- Usa expresiones colombianas naturales: \"listo\", \"claro\", \"con gusto\", \"\u00bfen qu\u00e9 m\u00e1s puedo ayudarte?\", \"seguimos\", \"ya mismo\", \"ah\u00ed te va\", \"dime\"
- M\u00e1ximo 5 l\u00edneas por respuesta (EXCEPCI\u00d3N: si el cliente pide la lista completa de servicios/precios, incluye TODOS los servicios sin importar cu\u00e1ntas l\u00edneas ocupe - NUNCA trunques la lista de servicios)
- En conversaciones normales termina con una pregunta
- NUNCA termines con pregunta al confirmar una cita o al emitir un c\u00f3digo de acci\u00f3n
- FORMATO DE FECHA: Usa lenguaje natural. CORRECTO: \"el mi\u00e9rcoles 8 de abril\". INCORRECTO: \"08/04/2026\"
- ASESOR\u00cdA: Si el cliente pide recomendaci\u00f3n, resp\u00f3ndela brevemente antes de continuar.
- SIN\u00d3NIMOS: \"motilado\", \"motilar\", \"pelar\", \"pelado\" = Corte caballero. \"Arreglo de barba\" = Barba. Entiende el sin\u00f3nimo pero confirma siempre con el nombre oficial del servicio.
- SERVICIOS: NUNCA menciones servicios fuera de tu lista. Si no existe: \"Lo sentimos, ese servicio no est\u00e1 disponible. Nuestros servicios son: ${d.servicesText}. \u00bfPuedo ayudarte con alguno? \U0001f60a\"
- SCOPE: Solo puedes hablar de citas, servicios, horarios y precios de ${d.promptName}. Si el mensaje no tiene relaci\u00f3n con ninguno de estos temas, responde en m\u00e1ximo 1 l\u00ednea redirigiendo: \"Solo puedo ayudarte con citas en ${d.promptName} \U0001f60a \u00bfQuieres agendar, cancelar o reagendar?\" Sin elaborar, sin dar consejos generales, sin salirte del rol.
- DATOS PERSONALES (Ley 1581): Si el cliente pregunta sobre el uso de sus datos, privacidad, protecci\u00f3n de datos, \"para qu\u00e9 van a usar mi informaci\u00f3n\", \"d\u00f3nde guardan mis datos\" o similar \u2192 responde: \"Tus datos personales est\u00e1n protegidos conforme a la Ley 1581 de Protecci\u00f3n de Datos en Colombia. Solo usamos tu informaci\u00f3n para gestionar tus citas. Si quieres conocer todos los detalles, puedes consultar nuestra pol\u00edtica de privacidad en ${d.politicaPrivacidadUrl || '[enlace a pol\u00edtica de privacidad]'}. \u00bfNecesitas algo m\u00e1s? \U0001f60a\" No inventes informaci\u00f3n adicional sobre protecci\u00f3n de datos.
- RECOMENDACIONES: Si el cliente pregunta cu\u00e1l servicio le conviene o qu\u00e9 corte/tratamiento le recomiendas, puedes responder brevemente bas\u00e1ndote \u00daNICAMENTE en los servicios de tu lista y luego invitar a agendar. Ejemplo: \"Para algo r\u00e1pido te recomendamos el Corte caballero \U0001f488 \u00bfTe agendo?\" Nunca recomiendes cosas fuera de tu cat\u00e1logo.`;"""

c33 = c33[:idx_start] + new_tono + c33[idx_end:]
nodes[33]['parameters']['jsCode'] = c33
print("NODE [33]: B9 Colombian tone + B10 Ley 1581")

# Save
with open(wf, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Verify
import re

print("\n=== VERIFICATION ===")
c6 = nodes[6]['parameters']['jsCode']
c33 = nodes[33]['parameters']['jsCode']

all_ok = True
checks = [
    ("Node[6]: No a.m./p.m.", ".replace(/AM/g, 'a.m.')" not in c6),
    ("Node[6]: dispCompleta declared", "let disponibilidadCompleta = '';" in c6),
    ("Node[6]: dispCompleta date header", "disponibilidadCompleta += `\U0001f4c5" in c6),
    ("Node[6]: dispCompleta prof line (4-space)", "    const todas = horasFormateadas" in c6),
    ("Node[6]: dispCompleta in return", "disponibilidadCompleta," in c6),
    ("Node[33]: HORARIOS COMPLETOS", "HORARIOS COMPLETOS (sin l\u00edmite)" in c33),
    ("Node[33]: M\u00c1S HORARIOS rule", "M\u00c1S HORARIOS" in c33),
    ("Node[33]: Colombian neutral", "colombiano neutro" in c33),
    ("Node[33]: No voseo recomend\u00e1s", "recomend\u00e1s" not in c33),
    ("Node[33]: No Quer\u00e9s", "Quer\u00e9s" not in c33),
    ("Node[33]: Ley 1581", "Ley 1581" in c33),
    ("Node[33]: politcaPrivacidadUrl", "politicaPrivacidadUrl" in c33),
    ("JSON valid parse", True),
]
for label, ok in checks:
    if not ok:
        all_ok = False
    print(f"  {'OK' if ok else 'FAIL'}: {label}")

# Extra: scope verification in node 6
lines = c6.split('\n')
hf_indent = None
for i, line in enumerate(lines):
    if 'const horasFormateadas' in line:
        hf_indent = len(line) - len(line.lstrip())
    if 'const todas' in line:
        t_indent = len(line) - len(line.lstrip())
        if hf_indent and t_indent >= hf_indent:
            print(f"  OK: Scope - todas(indent={t_indent}) >= horasFormateadas(indent={hf_indent})")
        else:
            print(f"  FAIL: Scope - todas({t_indent}) < horasFormateadas({hf_indent})")
            all_ok = False

if all_ok:
    print("\nALL CHECKS PASSED")
else:
    print("\nSOME CHECKS FAILED")
