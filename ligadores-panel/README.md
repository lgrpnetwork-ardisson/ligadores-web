# Panel de Ligadores

Panel web con login de Discord para el servidor de FiveM **Ligadores**: expediente de personaje (dinero, inventario, tiempo jugado), whitelist con seguimiento de estado, mercado de VIP/monedas/casas, y panel de administración.

## 1. Requisitos

- Node.js 18 o superior
- Acceso a la misma base de datos MySQL que usa tu servidor ESX o QBCore
- Una aplicación creada en el [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)

## 2. Configurar la aplicación de Discord

1. Ve a https://discord.com/developers/applications → **New Application** → nómbrala "Ligadores".
2. En el menú lateral, entra a **OAuth2 → General**.
3. Copia el **Client ID** y genera/copia el **Client Secret**.
4. En **Redirects**, agrega exactamente:
   - Desarrollo: `http://localhost:3000/auth/discord/callback`
   - Producción: `https://tu-dominio.com/auth/discord/callback`
5. Guarda cambios.

## 3. Instalación

```bash
cd ligadores-panel
npm install
cp .env.example .env
```

Edita `.env` con:
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_CALLBACK_URL` (del paso 2)
- `ADMIN_DISCORD_IDS`: tu ID de Discord (activa el modo desarrollador en Discord → clic derecho en tu perfil → "Copiar ID") separado por comas si son varios admins
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: los mismos datos de conexión que usa tu servidor FiveM
- `FRAMEWORK`: `esx` o `qbcore` según tu servidor
- `SESSION_SECRET`: cualquier string largo y aleatorio

## 4. Base de datos

Importa las tablas propias del panel (no toca las de tu framework):

```bash
mysql -u root -p ligadores < db/schema.sql
```

Esto crea `shop_items` (con 4 artículos de ejemplo), `orders`, y la tabla `discord_links` que usa Qbox.

### 4.1 Migración: trabajos con jefes + wiki de normativa

El panel ya NO usa una whitelist genérica. En su lugar:
- Los jugadores se postulan a **trabajos** específicos (`/jobs`).
- Cada trabajo tiene sus propios **jefes** (Discord IDs asignados desde `/admin/jobs`), y solo ellos (o los admins) pueden aprobar/rechazar postulaciones a ESE trabajo desde `/jobs/boss`.
- La **normativa** ahora es una wiki: los admins crean, editan y borran artículos desde `/admin/wiki`, usando Markdown (`# títulos`, `**negritas**`, listas con `-`).

Importa esta migración (en HeidiSQL: selecciona tu base de datos → Archivo → Ejecutar archivo SQL → elige el archivo):

```bash
mysql -u root -p ligadores < db/migration_002_jobs_wiki.sql
```

Esto crea `jobs`, `job_bosses`, `job_applications` y `wiki_articles`, con un trabajo de ejemplo ("Policía Metropolitana") y un artículo de bienvenida. La tabla vieja `whitelist_applications` no se borra sola — si ya no la necesitas, bórrala tú manualmente:
```sql
DROP TABLE IF EXISTS whitelist_applications;
```

## 5. ⚠️ Ajusta las consultas a TU servidor

Cada instalación de FiveM personaliza sus tablas. Antes de usar en producción, revisa **`src/config/db.js`**:

- Busca los comentarios `AJUSTA AQUÍ`.
- Confirma que los nombres de tabla/columna (`users`, `players`, `money`, `charinfo`, etc.) coincidan con tu base de datos real.
- El inventario varía mucho según el script que uses (`ox_inventory`, `qb-inventory`, `esx_inventoryhud`...): adapta la consulta a tu tabla real.
- El tiempo jugado (`playtime`) casi nunca viene por defecto — probablemente necesites crear esa columna/tabla tú mismo si aún no la tienes.

### 5.1 Si usas Qbox (`qbx_core`) — paso extra obligatorio

La tabla `players` de Qbox identifica a cada personaje por `citizenid`, y su identificador persistente es el `license` de Rockstar — **no guarda el Discord ID en ninguna columna por defecto**. Por eso el panel necesita una tabla puente (`discord_links`) que conecte `citizenid` con `discord_id`.

Para llenarla automáticamente:

1. Copia la carpeta `fivem-resource/ligadores_discordlink` a la carpeta `resources` de tu servidor de FiveM.
2. Agrégala a tu `server.cfg`, después de `qbx_core`:
   ```
   ensure qbx_core
   ensure ligadores_discordlink
   ```
3. Reinicia el servidor. Cada vez que un jugador cargue su personaje, se guardará (o actualizará) su `citizenid` junto a su Discord ID en la tabla `discord_links`.

Sin este paso, el dashboard del panel (`/dashboard`) siempre mostrará "no encontramos un personaje vinculado", porque no hay forma de saber a qué `citizenid` corresponde cada Discord ID.

El inventario se lee de la tabla `inventories` de `ox_inventory` (columna `owner` = `citizenid`, columna `data` = JSON). Si tu versión de `ox_inventory` usa otros nombres, ajústalos en `getCharacterQBox()` dentro de `src/config/db.js`.

### 5.2 Tiempo jugado y mugshot automático (Fivemanage)

El resource `fivem-resource/lg-tracker` hace dos cosas automáticamente en tu servidor de FiveM, sin que tengas que tocar la base de datos ni el panel web:

- Suma 1 minuto de tiempo jugado cada 60 segundos que un jugador está conectado.
- Toma una foto (mugshot) del personaje 5 segundos después de que carga, y la sube directo a Fivemanage con `screencapture:remoteUpload`.

Ambos se guardan en `metadata.playtime` y `metadata.photo` de la tabla `players` — que es **exactamente** lo que el panel ya lee en `getCharacterData()`. No hace falta ningún cambio adicional en la web.

**Requisitos previos:**
1. Ya tienes [`screencapture`](https://github.com/itschip/screencapture) instalado (el sucesor de `screenshot-basic`) — no se necesita nada más.
2. Crea una cuenta gratis en [fivemanage.com](https://fivemanage.com) y genera tu API key de tipo **Media**.

**En `fivem-resource/lg-tracker/server.lua`, pon tu key directo en el código:**
```lua
local FIVEMANAGE_API_KEY = 'tu_api_key_aqui'
```
⚠️ Como la key queda escrita directo en este archivo, **no subas esta carpeta con la key puesta a un repositorio público de GitHub** — solo cópiala directo a tu servidor de FiveM.

**En tu `server.cfg`, en este orden:**
```
ensure screencapture
ensure qbx_core
ensure lg-tracker
```

**Ajustes disponibles** (arriba del `server.lua`):
- `PLAYTIME_INTERVAL_MS`: cada cuánto se suma tiempo jugado (por defecto, cada minuto real).
- `MUGSHOT_DELAY_MS`: cuánto espera tras cargar el personaje antes de tomar la foto, para evitar capturar la pantalla de carga.

**Nota sobre privacidad:** como esto toma una captura de pantalla del jugador automáticamente en cada conexión, es buena práctica mencionarlo en tu normativa (`/rules`) para que la comunidad sepa que existe.

## 6. Correr el panel

```bash
npm run dev     # con recarga automática (nodemon)
# o
npm start
```

Abre `http://localhost:3000`.

## 7. Cómo funciona cada parte

- **Login** (`/login`, `/auth/discord`, `/auth/discord/callback`): flujo OAuth2 estándar de Discord vía Passport. La sesión se guarda en MySQL (tabla que crea automáticamente `express-mysql-session`).
- **Dashboard** (`/dashboard`): busca el personaje del usuario en tu base de datos por su Discord ID.
- **Trabajos** (`/jobs`): lista trabajos abiertos y permite postularse. Cada jugador ve el estado de sus postulaciones en `/jobs/mine`.
- **Panel de jefe** (`/jobs/boss`): un jefe solo ve y decide sobre las postulaciones de los trabajos que administra. Los admins ven y deciden sobre todos.
- **Normativa / wiki** (`/rules`): lectura pública, agrupada por categoría. Los admins editan desde `/admin/wiki` usando Markdown.
- **Mercado** (`/shop`): lista artículos activos. Al comprar, se crea una **orden pendiente** — no hay cobro automático todavía.
- **Administración** (`/admin`, solo IDs en `ADMIN_DISCORD_IDS`): gestionar trabajos y sus jefes, artículos del mercado, artículos de la wiki, y marcar órdenes como pagadas.

## 8. Conectar un cobro automático real

Ahora mismo las compras quedan como "pendiente" para que un admin las confirme a mano. Para automatizarlo, edita `src/routes/shop.routes.js` en la sección marcada:

```js
// ============================================================
// AQUÍ VA TU PASARELA DE PAGO REAL (Tebex, PayPal, Stripe, etc.)
// ============================================================
```

Ahí puedes redirigir a un checkout de **Tebex** (el más usado en FiveM), o integrar el SDK de **Stripe/PayPal** y marcar la orden como `fulfilled` automáticamente cuando el webhook de pago confirme el cobro.

## 9. Poner esto en producción

- Sirve el panel detrás de HTTPS (Nginx + Let's Encrypt, o Cloudflare). El `.env` tiene `secure: true` en cookies cuando `NODE_ENV=production`.
- Usa un proceso persistente: `pm2 start src/server.js --name ligadores-panel`.
- No subas tu `.env` real a ningún repositorio público.
