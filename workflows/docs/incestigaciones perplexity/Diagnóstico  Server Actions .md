## Causa raíz probable

El error `Failed to find Server Action "..."` es un mensaje oficial de Next.js documentado directamente en sus mensajes de error. Next.js genera IDs de Server Action encriptados y **no deterministas** en cada build, específicamente para seguridad (evitar que el ID sea predecible). Cuando se auto-hostea la aplicación (como en este caso, en un VPS con PM2), cada nuevo build/reinicio genera una clave de encriptación distinta a menos que se fije explícitamente, lo que provoca el desajuste entre el ID que el navegador tiene cacheado en su bundle JS y el ID que el servidor reconoce tras el redeploy o restart.[^1][^2]

Este comportamiento es ampliamente reportado en la comunidad de Next.js, incluyendo discusiones abiertas específicas para Next.js 16. Un hilo reciente de diciembre 2025/2026 en discusiones oficiales de Vercel confirma que esto ocurre tanto en Next.js 15 como 16, y detalla dos causas distintas que producen el mismo mensaje.[^3][^2]

## Respuestas a las preguntas de investigación

### 1. ¿Por qué los Server Action IDs son inestables entre builds?

Por diseño: Next.js encripta las referencias de Server Actions en tiempo de build usando una clave que, si no se fija manualmente, se genera de forma aleatoria en cada build. Esto es parte del sistema de "encrypted action IDs and dead code elimination" que impide exponer acciones no usadas como endpoints públicos, y del cifrado de variables de closure capturadas por la acción. En despliegues multi-instancia o self-hosted (como PM2 en un VPS único, pero especialmente si hay más de un proceso/contenedor), cada instancia puede terminar con una clave distinta si no se especifica `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.[^4][^5][^1]

### 2. ¿Hay alguna configuración de Next.js/Turbopack que estabilice los IDs?

Sí. La solución oficial y confirmada por múltiples fuentes es fijar la variable de entorno `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` con una clave AES válida (16, 24 o 32 bytes, codificada en base64). Puntos críticos reportados repetidamente por usuarios que resolvieron el mismo error:[^2][^5][^1]

- La clave debe generarse con `openssl rand -base64 32` (o equivalente en Node: `crypto.randomBytes(32).toString('base64')`).[^5][^2]
- **Debe estar presente en tiempo de BUILD, no solo en runtime** — este es el error más común que la gente comete al intentar el fix y por el cual "sigue fallando". La clave queda embebida en el output del build, así que si se define solo como variable de entorno de PM2/runtime pero no estaba presente cuando se ejecutó `next build`, el problema persiste.[^6][^2][^5]
- En Docker, hay que pasarla tanto como build arg como variable de entorno de runtime.[^2]
- Debe permanecer **idéntica** entre builds sucesivos; si se regenera cada vez, el problema vuelve a aparecer.

Adicionalmente, Next.js sugiere para self-hosting usar rolling deployments en vez de cortes abruptos, y tratar el error como un "retry path" en la UI (ej. recargar automáticamente) en lugar de un fallo duro, ya que aun con la clave fija puede haber una ventana breve de desajuste durante el propio deploy.[^4][^5]

### 3. ¿Es un bug conocido de Next.js 16 + Turbopack?

No es un bug de Turbopack específicamente — es un comportamiento de diseño de Server Actions que existe desde Next.js 14 y continúa en 15 y 16. Los números de error 973-975 en `errors.json` de Next.js confirman que este mensaje sigue existiendo sin cambios funcionales entre versiones recientes 16.1.7 y 16.2.0. Turbopack no introduce el problema; simplemente el mecanismo de IDs encriptados no deterministas por build es igual con Webpack o Turbopack.[^7][^8][^9][^10][^3]

Hay un matiz importante detectado en fuentes de 2025-2026: parte del ruido de este error en producción también proviene de **bots que prueban explotar la vulnerabilidad "react2shell"** enviando cabeceras `next-action` con strings cortos y falsos (como `"x"` o `"test"`). Esos casos se distinguen fácilmente porque los IDs válidos de Server Action son hashes hexadecimales de 40+ caracteres — si en los logs de PM2 aparece un ID corto y no un hash largo, es tráfico malicioso y no un problema real de sincronización. En el caso de meyer-bot, el ID reportado (`70186bc56c58b58fd5f0c302198e5e35db82e35120`) es un hash largo, lo que confirma que se trata del **Cause 2: Mismatched server action IDs** (no bots), es decir, builds con claves de encriptación distintas.[^11][^2]

### 4. ¿Alternativa: convertir a API route (`/api/appointments/month`)?

Es una alternativa viable y ampliamente usada como workaround cuando el fix de la clave de encriptación no es suficiente o se busca una solución más robusta y menos frágil ante despliegues. Las Route Handlers (`/api/.../route.ts`) no dependen del sistema de IDs encriptados no deterministas de Server Actions — se invocan por su URL/ruta HTTP estática, que no cambia entre builds. Esto elimina por completo la clase de error `Failed to find Server Action`, a costa de perder algunas conveniencias de Server Actions (invalidación automática de caché, progressive enhancement de formularios, etc., que en este caso — una simple carga de datos GET — no aportan mucho valor).

Dado que `getAppointmentsByMonthV2` y `getWeekAppointmentsV2` son operaciones de **lectura** (GET conceptual, sin mutación), son candidatas ideales para migrar a Route Handlers: no requieren el mecanismo de invalidación de Server Actions y se benefician de ser cacheables/debuggeables como endpoints REST normales.

### 5. ¿Por qué el Calendario SÍ funciona si usa los mismos server actions?

Esto es la pista más importante y sugiere que el problema no es puramente de sincronización de IDs entre navegador y servidor (si lo fuera, *ambas* vistas fallarían de forma idéntica, ya que ambas invocan Server Actions del mismo build). Las explicaciones más probables, en orden de probabilidad según los patrones descritos:

- **Timing de montaje / closure obsoleta**: si el componente `AgendaListContainerV2` se monta con props (`businessId`, `year`, `month`, `profId`) que en el primer render son `undefined` o distintos del valor final, el `useCallback` de `loadData` puede capturar una referencia a la Server Action asociada a una versión distinta del módulo, especialmente si hay imports indirectos (ver hallazgo abajo) o si `week-viewV2.tsx` reordena/desmonta y remonta el componente al cambiar de vista, ejecutando `loadData` antes de que el bundle esté completamente hidratado.
- **Import indirecto de la Server Action**: un patrón confirmado en discusiones de Next.js causa exactamente este síntoma — si la acción se importa a través de un archivo `index.ts` que re-exporta (`export * from './actionsV2'`) en lugar de importarse directamente desde `actionsV2.ts`, Next.js puede fallar en resolver el ID solo para esa acción específica, mientras otras acciones importadas directamente (como las que usa el Calendario) funcionan sin problema. Esto explicaría por qué **una vista falla y la otra no**, a pesar de compartir el mismo build y las mismas Server Actions "en teoría" (`getAppointmentsByMonthV2` vs `getWeekAppointmentsV2` pueden tener rutas de import distintas hacia `actionsV2.ts`).[^8]
- **Diferencia real en la ruta de invocación**: si el Calendario invoca `getWeekAppointmentsV2` desde un componente que se renderiza en el server (o desde una ruta de navegación distinta) mientras que la Lista lo hace desde un client component que se hidrata después, el desajuste de bundle/versión solo se manifiesta en el segundo caso.

Se recomienda verificar en el código deployado exactamente cómo se importa `getAppointmentsByMonthV2` en `agenda-list-containerV2.tsx` versus cómo se importa `getWeekAppointmentsV2` en el componente de calendario — un import indirecto vía barrel file (`index.ts`) en solo uno de los dos casos es la explicación más consistente con la evidencia disponible.[^8]

## Plan de acción recomendado

| Prioridad | Acción | Justificación |
|---|---|---|
| 1 | Fijar `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` en `.env` **y** re-ejecutar `next build` con esa variable presente (no solo en runtime de PM2) | Causa raíz documentada oficialmente; falla si solo se define en runtime[^1][^2][^5] |
| 2 | Revisar si `getAppointmentsByMonthV2` se importa vía un archivo barrel/index en vez de importarse directamente desde `actionsV2.ts` | Explica por qué solo la Lista falla y el Calendario no[^8] |
| 3 | Migrar `getAppointmentsByMonthV2` (y opcionalmente `getBloqueosV2`) a un Route Handler `/api/appointments/month` | Elimina la dependencia del sistema de IDs encriptados para esta lectura de datos; es una operación GET pura sin mutación |
| 4 | Confirmar que el ID de error en logs de PM2 sea siempre un hash largo (40+ caracteres) y no strings cortos, para descartar tráfico de bots explotando react2shell | Filtra ruido irrelevante de los logs[^2][^11] |
| 5 | Reiniciar PM2 con `pm2 restart meyer-dashboard --update-env` tras fijar la variable, para asegurar que el proceso runtime también la vea | Consistencia entre build-time y runtime[^2][^6] |
| 6 | Agregar un mecanismo de auto-reload en el cliente cuando se detecte este error (retry path), en vez de solo dejar el error en consola | Recomendación oficial de Next.js para mitigar la ventana de desajuste incluso con clave fija[^4] |

Los intentos previos (modo incógnito, `Cache-Control`, ref de `initialLoadDone`) no resuelven el problema porque atacan síntomas del lado del navegador (caché de HTML/JS), pero el error real ocurre en el servidor al intentar decodificar el ID de la acción con una clave de encriptación que cambió entre el build que generó el bundle del navegador y el build actualmente corriendo bajo PM2. Ni el modo incógnito ni las cabeceras de caché afectan la clave de encriptación embebida en el servidor.[^12][^1][^6]

---

## References

1. [Failed to find Server Action](https://nextjs.org/docs/messages/failed-to-find-server-action)

2. [Failed to find Server Action "x" · vercel next.js · Discussion #87851](https://github.com/vercel/next.js/discussions/87851) - Summary in production I keep getting "[Error: Failed to find Server Action "x". This request might b...

3. [Need help for [Error: Failed to find Server Action `${actionId}`. This request might be from an older or newer deployment. Original error: Cannot read properties of undefined (reading 'workers')] · vercel next.js · Discussion #76149](https://github.com/vercel/next.js/discussions/76149) - Summary So after I updated to nextjs 15 and a lot of changes, this issue occurred and I have tried f...

4. [Guides: Server Actions | Next.js](https://nextjs.org/docs/app/guides/server-actions)

5. [Next.js 16 Server Actions Invalid Error in Production](https://qasimcode.com/blog/2026-04-19-nextjs-16-server-actions-invalid-error) - Next.js 16 Server Actions throwing 'Invalid Server Action' in production after deploy? Here is the c...

6. [Getting Failed to find Server Action exception](https://station.railway.com/questions/getting-failed-to-find-server-action-ex-4534e489) - Hi, I am getting the exception below every day. Not sure of the reason. Could you please help? \[Err...

7. [Next.jsの「Failed to find Server Action “ServerActionID”.」を固有のビルドIDを設定して解消する](https://www.braveryk7.com/nextjs-failed-to-find-server-action-use-serveractionid-reflesh/) - Next.jsはAppRouterでServerActionsが導入されましたが、ServerActions関数は毎ビルド時固有のIDを生成します。ブラウザで実行中のアプリで持っているIDとサーバー側...

8. [Error: Failed to find Server Action. This request might be from an older or newer deployment. Original error: Cannot read properties of undefined (reading 'workers') · vercel next.js · Discussion #65969](https://github.com/vercel/next.js/discussions/65969) - Summary I'll explain what my problem is. I have a package in which I expose a client component that ...

9. [next.js: packages/next/errors.json - 16.1.7 vs. 16.2.0 ... - Fossies](https://fossies.org/diffs/next.js/16.1.7_vs_16.2.0/packages/next/errors.json-diff.html) - Source code changes report for the member file packages/next/errors.json of the next.js software pac...

10. [Getting this error: Failed to find Server Action "4a682...". This request might be from an older or newer deployment. · Issue #58430 · vercel/next.js](https://github.com/vercel/next.js/issues/58430) - Link to the code that reproduces this issue https://github.com/VersesTech/genius-core-admin-ui To Re...

11. [Failed to find Server Action | Next.js Discord Forum](https://nextjs-forum.com/post/1449485860323197132) - Error: Failed to find Server Action "x". This request might be from an older or newer deployment. Re...

12. [Nextjs Failed to find Server Action "null"](https://stackoverflow.com/questions/78262514/nextjs-failed-to-find-server-action-null) - Hitting this log only on production and is not reproducible everytime: Error: Failed to find Server ...

