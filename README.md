# Meyer Bot

> Agente de WhatsApp con IA para Peluquería Meyer — automatización de citas, recordatorios y atención al cliente 24/7.

![Stack](https://img.shields.io/badge/stack-n8n%20%2B%20Evolution%20API%20%2B%20Claude%20Haiku-blueviolet)
![Status](https://img.shields.io/badge/estado-beta%20activo-brightgreen)
![License](https://img.shields.io/badge/licencia-privado-lightgrey)

---

## Descripción

Meyer Bot automatiza el canal de WhatsApp Business de Peluquería Meyer. Los clientes pueden reservar citas, consultar servicios y recibir recordatorios sin intervención humana en el flujo estándar.

**Capacidades actuales**

- Atención al cliente 24/7 con respuestas en lenguaje natural
- Consulta de disponibilidad y reserva de citas
- Recordatorios automáticos 24 h antes de cada turno
- Información sobre servicios, precios y horarios
- Escalado a humano cuando el agente no puede resolver

---

## Arquitectura

```
Cliente (WhatsApp)
        │
        ▼
 Evolution API          ← Gateway WhatsApp Business (self-hosted, VPS :8080)
        │  webhook
        ▼
  n8n Workflow          ← Orquestación y lógica de negocio (self-hosted)
        │
        ├──► Claude Haiku   ← Generación de respuestas IA (Anthropic API)
        │
        └──► Google Sheets  ← Almacenamiento de citas y datos de clientes
```

### Componentes

| Componente      | Rol                              | Endpoint                      |
|-----------------|----------------------------------|-------------------------------|
| Evolution API   | Gateway WhatsApp Business        | `VPS:8080`                    |
| n8n             | Motor de workflows               | `https://n8n.zyvenshop.com`   |
| Claude Haiku    | Generación de respuestas IA      | Anthropic API                 |
| Google Sheets   | Base de datos de citas           | Google Cloud                  |

---

## Workflows

| Archivo                      | Descripción                                    | Trigger                        |
|------------------------------|------------------------------------------------|--------------------------------|
| `peluqueria-beta.json`       | Flujo principal: saludo, consultas y reservas  | Webhook — Evolution API        |
| `recordatorios-meyer.json`   | Recordatorios automáticos de citas             | Cron — todos los días 9:00 AM  |

---

## Estructura de carpetas

```
meyer-bot/
├── workflows/
│   ├── peluqueria-beta.json        # Flujo principal de conversación
│   └── recordatorios-meyer.json    # Recordatorios automáticos
├── prompts/
│   └── meyer-system-prompt.md      # System prompt del agente IA
├── docs/
│   └── proyecto.md                 # Documentación técnica y estado
├── clientes/
│   └── meyer/
│       └── config.md               # Configuración específica del cliente
├── secrets/                        # IGNORADO por Git — credenciales locales
│   └── google-credentials.json     # Service Account Google Cloud
├── .env                            # IGNORADO por Git — variables locales
├── .env.example                    # Plantilla de variables de entorno
└── .gitignore
```

---

## Requisitos

- VPS Ubuntu 20.04+ con Docker
- [n8n](https://n8n.io) self-hosted (v1.x)
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) self-hosted
- Cuenta [Anthropic](https://console.anthropic.com) con acceso a Claude Haiku
- Google Cloud Service Account con permisos sobre Google Sheets
- Número de WhatsApp Business conectado a Evolution API

---

## Configuración

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd meyer-bot
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales:

```env
# ================================
# EVOLUTION API
# ================================
EVOLUTION_API_URL=https://tu-servidor:8080
EVOLUTION_API_KEY=tu-api-key-aqui

# ================================
# GOOGLE (Service Account)
# ================================
GOOGLE_CREDENTIALS_PATH=./secrets/google-credentials.json
GOOGLE_SHEET_ID=id-de-tu-google-sheet

# ================================
# ANTHROPIC
# ================================
# La key se configura directamente en n8n como credencial.
# Solo necesaria si se usa la API fuera de n8n.
ANTHROPIC_API_KEY=

# ================================
# n8n
# ================================
N8N_URL=https://n8n.zyvenshop.com
```

> **Nota:** La API key de Anthropic se gestiona como credencial nativa en n8n. No es necesaria en `.env` para el flujo normal.

### 3. Credenciales de Google

Descargar el JSON de Service Account desde Google Cloud Console y colocarlo en:

```
secrets/google-credentials.json
```

Este archivo **nunca debe subirse a Git**.

### 4. Importar workflows en n8n

1. Ir a `https://n8n.zyvenshop.com` → **Workflows** → **Import from file**
2. Importar `workflows/peluqueria-beta.json`
3. Importar `workflows/recordatorios-meyer.json`
4. Configurar las credenciales de Anthropic y Google Sheets en **Settings → Credentials**
5. Activar ambos workflows

### 5. Conectar Evolution API

En Evolution API, apuntar el webhook del número de WhatsApp al endpoint generado por n8n al activar el workflow `peluqueria-beta`.

---

## Seguridad

- `.env` y `secrets/` están en `.gitignore` — **nunca commitear credenciales reales**
- Las API keys se gestionan como credenciales nativas en n8n
- Verificar `git status` antes de cada commit

---

## Estado del proyecto

- [x] Infraestructura VPS desplegada
- [x] n8n instalado y configurado
- [x] Evolution API conectada y funcional
- [x] Workflow principal beta activo
- [x] Recordatorios automáticos activos
- [ ] Integración con calendario / agenda externa
- [ ] Panel de métricas y reportes

---

## Cómo contribuir

1. Crear rama desde `main`:

   ```bash
   git checkout -b feat/nombre-feature
   ```

2. Realizar cambios. Si modificaste un workflow, exportarlo desde n8n y reemplazar el JSON en `workflows/`.

3. Actualizar `docs/proyecto.md` si hay cambios de arquitectura.

4. Abrir un PR con una descripción clara del cambio y por qué se hace.

**Convención de commits**

```
feat: nueva funcionalidad
fix: corrección de bug
chore: mantenimiento o configuración
docs: solo documentación
```

---

## Infraestructura

| Recurso  | Valor                        |
|----------|------------------------------|
| Servidor | VPS Ubuntu — TU_VPS_IP  |
| n8n      | https://n8n.zyvenshop.com    |
| Cliente  | Peluquería Meyer             |

---

*Parte de una plataforma SaaS de agentes WhatsApp con IA para negocios locales.*
