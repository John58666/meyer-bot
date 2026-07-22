#!/usr/bin/env python3
"""
Apply B11 — Post-LLM validation gap
PASO 1: Modify Leer Disponibilidad (PostgreSQL node [8]) query
PASO 2: Add rules in AI Agent (Code node [33]) jsCode prompt
"""
import json
import sys
import shutil
from pathlib import Path

WORKFLOW_PATH = Path(__file__).parent.parent / "workflows" / "WhatsApp Bot - Genérico.json"
BACKUP_PATH = WORKFLOW_PATH.with_suffix(".bak.json")

# ── PASO 1: New query for Leer Disponibilidad ──────────────────────────

NEW_QUERY = """\
WITH datos AS (
  SELECT
    {{ $('Procesar Mensaje').item.json.businessId }} AS business_id,
    TO_DATE('{{ $('AI Agent').item.json.output.split('|')[2] }}', 'DD/MM/YYYY') AS fecha_slot,
    '{{ $('AI Agent').item.json.output.split('|')[3].split('\\n')[0].trim() }}'::time AS hora_slot,
    '{{ $('AI Agent').item.json.output.split('|')[4].trim() }}' AS professional_name
),
prof_id AS (
  SELECT id FROM professionals
  WHERE name = (SELECT professional_name FROM datos)
    AND business_id = (SELECT business_id FROM datos)
  LIMIT 1
)
SELECT COUNT(*) as total FROM (
  -- 1. Collision de appointments (original)
  SELECT 1 FROM appointments a, datos d
  WHERE a.business_id = d.business_id
    AND a.fecha = d.fecha_slot
    AND a.estado != 'Cancelada'
    AND d.hora_slot >= a.hora
    AND d.hora_slot < a.hora + (30 + COALESCE((SELECT buffer_minutes FROM businesses WHERE id = d.business_id), 0)) * interval '1 minute'
    AND (
      d.professional_name = ''
      OR a.professional_id IS NULL
      OR a.professional_id = (SELECT id FROM prof_id)
    )

  UNION ALL

  -- 2. Dia sin horario (no existe en schedule_text)
  SELECT 1 FROM businesses b, datos d
  WHERE b.id = d.business_id
    AND NOT b.schedule_text ? EXTRACT(DOW FROM d.fecha_slot)::text

  UNION ALL

  -- 3. Dia cerrado en schedule_exceptions
  SELECT 1 FROM schedule_exceptions e, datos d
  WHERE e.business_id = d.business_id
    AND e.fecha = d.fecha_slot
    AND e.tipo = 'cerrado'
    AND (e.professional_id IS NULL OR e.professional_id = (SELECT id FROM prof_id))

  UNION ALL

  -- 4. Hora fuera de rango (horario_especial o schedule_text)
  SELECT 1 FROM datos d
  WHERE EXISTS (
    SELECT 1 FROM schedule_exceptions e
    WHERE e.business_id = d.business_id
      AND e.fecha = d.fecha_slot
      AND e.tipo = 'horario_especial'
      AND (e.professional_id IS NULL OR e.professional_id = (SELECT id FROM prof_id))
      AND (d.hora_slot < e.hora_inicio OR d.hora_slot >= e.hora_fin)
  )
  OR (
    NOT EXISTS (
      SELECT 1 FROM schedule_exceptions e
      WHERE e.business_id = d.business_id
        AND e.fecha = d.fecha_slot
        AND e.tipo = 'horario_especial'
        AND (e.professional_id IS NULL OR e.professional_id = (SELECT id FROM prof_id))
    )
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = d.business_id
        AND b.schedule_text ? EXTRACT(DOW FROM d.fecha_slot)::text
        AND (
          d.hora_slot < ((b.schedule_text->>EXTRACT(DOW FROM d.fecha_slot)::text)::jsonb->>'open')::int * interval '1 hour'
          OR d.hora_slot >= ((b.schedule_text->>EXTRACT(DOW FROM d.fecha_slot)::text)::jsonb->>'close')::int * interval '1 hour'
        )
    )
  )

  UNION ALL

  -- 5. Fecha/hora en el pasado
  SELECT 1 FROM datos d
  WHERE d.fecha_slot < (NOW() AT TIME ZONE 'America/Bogota')::date
     OR (d.fecha_slot = (NOW() AT TIME ZONE 'America/Bogota')::date AND d.hora_slot <= (NOW() AT TIME ZONE 'America/Bogota')::time)
) checks"""


def paso_1_modificar_query(nodes):
    """Modify the PostgreSQL query in node [8] Leer Disponibilidad"""
    node = nodes[8]
    assert node['name'] == 'Leer Disponibilidad', f"Expected 'Leer Disponibilidad', got '{node['name']}'"
    assert node['type'] == 'n8n-nodes-base.postgres', f"Expected postgres, got {node['type']}"
    
    old_query = node['parameters']['query']
    print(f"[PASO 1] Found current query ({len(old_query)} chars)")
    print(f"[PASO 1] Replacing with new query ({len(NEW_QUERY)} chars)")
    
    node['parameters']['query'] = NEW_QUERY
    return True


def paso_2_modificar_prompt(nodes):
    """Add 3 rules to the AI Agent jsCode in node [33]"""
    node = nodes[33]
    assert node['name'] == 'AI Agent', f"Expected 'AI Agent', got '{node['name']}'"
    assert node['type'] == 'n8n-nodes-base.code', f"Expected code, got {node['type']}"
    
    code = node['parameters']['jsCode']
    original_len = len(code)
    
    # ── Rule 1: Add strict availability rules to horariosDisponibles ──
    old_horarios = "const horariosDisponibles = `HORARIOS DISPONIBLES (próximos 7 días):\n${d.disponibilidad}`;"
    new_horarios = """const horariosDisponibles = `HORARIOS DISPONIBLES (próximos 7 días):
${d.disponibilidad}

REGLAS ESTRICTAS DE DISPONIBILIDAD:
- SOLO puedes ofrecer días y horas que aparezcan EXACTAMENTE en HORARIOS DISPONIBLES arriba. Si un día u hora no está en esa lista, no existe para ti. NUNCA inventes horarios ni asumas que un horario está disponible si no ves el día y hora exactos en la lista.`;"""
    
    if old_horarios not in code:
        print("[ERROR] Could not find horariosDisponibles section")
        print(f"Looking for: {repr(old_horarios[:100])}")
        return False
    
    code = code.replace(old_horarios, new_horarios, 1)
    print(f"[PASO 2.1] Updated horariosDisponibles — added strict availability rules")
    
    # ── Rule 2: Add AM/PM exception rule in agendamiento step 5 ──
    old_ampm = "   NUNCA asumas AM o PM por el contexto del día."
    new_ampm = """   NUNCA asumas AM o PM por el contexto del día.

   EXCEPCIÓN — Todos en PM:
   Si TODOS los horarios disponibles que mostraste para ESE día están en PM
   (ej: 2:00 PM, 3:00 PM, 4:00 PM...), NO preguntes AM o PM. Asume PM automáticamente.
   Esta regla de EXCEPCIÓN prevalece sobre la regla general de "siempre preguntar AM/PM"."""
    
    if old_ampm not in code:
        print("[ERROR] Could not find AM/PM section")
        return False
    
    code = code.replace(old_ampm, new_ampm, 1)
    print(f"[PASO 2.2] Updated AM/PM section — added exception rule for all-PM slots")
    
    # ── Rule 3: Add professional list rule in agendamiento step 2 ──
    old_prof = """   → Si el cliente YA dijo "cualquiera", "el que tenga espacio", "no importa" o similar:
     → NO preguntes. Elige el primero disponible y continúa.
   → Si el cliente YA dijo un nombre o número → úsalo, no preguntes"""
    
    new_prof = """   → Si el cliente YA dijo "cualquiera", "el que tenga espacio", "no importa" o similar:
     → NO preguntes. Elige el primero disponible y continúa.
   → Si el cliente dice que no sabe qué profesional elegir (ej: "no sé", "cuál me recomiendas", "quién es bueno"):
     → MUÉSTRALE la lista numerada completa de profesionales (1. Camila\\n2. Cristian\\n3. John\\n4. Julian\\n5. Juliana)
     → Pregunta: "¿Con cuál de estos te gustaría agendar? 😊"
     → Si insiste en que no sabe, sugiérele el primero de la lista y pregúntale si le parece bien.
   → Si el cliente YA dijo un nombre o número → úsalo, no preguntes"""
    
    if old_prof not in code:
        print("[ERROR] Could not find professional selection section")
        return False
    
    code = code.replace(old_prof, new_prof, 1)
    print(f"[PASO 2.3] Updated professional section — added numbered list rule")
    
    # Verify changes
    new_len = len(code)
    print(f"[PASO 2] jsCode length: {original_len} → {new_len} chars (+{new_len - original_len})")
    
    node['parameters']['jsCode'] = code
    return True


def main():
    # Load JSON
    print(f"Loading workflow from {WORKFLOW_PATH}")
    with open(WORKFLOW_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    nodes = data if isinstance(data, list) else data.get('nodes', [])
    
    # Create backup
    print(f"Creating backup at {BACKUP_PATH}")
    shutil.copy2(WORKFLOW_PATH, BACKUP_PATH)
    
    # Apply both steps
    ok1 = paso_1_modificar_query(nodes)
    ok2 = paso_2_modificar_prompt(nodes)
    
    if not (ok1 and ok2):
        print("[ERROR] Failed to apply changes. Restoring backup...")
        shutil.copy2(BACKUP_PATH, WORKFLOW_PATH)
        sys.exit(1)
    
    # Save
    with open(WORKFLOW_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ B11 applied successfully!")
    print(f"   Backup saved at: {BACKUP_PATH}")
    print(f"   Workflow saved at: {WORKFLOW_PATH}")


if __name__ == '__main__':
    main()
