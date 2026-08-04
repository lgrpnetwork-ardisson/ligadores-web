require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('./config/passport');
const path = require('path');

const app = express();

// Necesario en Render (y cualquier hosting detrás de un proxy/balanceador):
// sin esto, las cookies de sesión "secure" no funcionan bien detrás de HTTPS terminado en el proxy.
app.set('trust proxy', 1);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  key: 'ligadores_sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // requiere HTTPS en producción
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Home con contenido dinámico
app.get('/', async (req, res, next) => {
  try {
    const { pool } = require('./config/db');
    const [[{ jobsCount }]] = await pool.query(`SELECT COUNT(*) as jobsCount FROM jobs WHERE active = 1`);
    const [[{ shopCount }]] = await pool.query(`SELECT COUNT(*) as shopCount FROM shop_items WHERE active = 1`);
    const [[{ wikiCount }]] = await pool.query(`SELECT COUNT(*) as wikiCount FROM wiki_articles`);
    res.render('home', { user: req.user, title: 'Panel de Ligadores', jobsCount, shopCount, wikiCount });
  } catch (err) {
    // Si la base de datos aún no tiene las tablas nuevas, no tumbamos el home.
    res.render('home', { user: req.user, title: 'Panel de Ligadores', jobsCount: 0, shopCount: 0, wikiCount: 0 });
  }
});

app.use(require('./routes/auth.routes'));
app.use(require('./routes/dashboard.routes'));
app.use(require('./routes/jobs.routes'));
app.use(require('./routes/wiki.routes'));
app.use(require('./routes/shop.routes'));
app.use(require('./routes/admin.routes'));

// Endpoint opcional para disparar el chequeo de vencimientos de VIP desde un
// servicio de cron externo (ej. cron-job.org), por si el panel se duerme por
// inactividad y el scheduler interno no llega a correr a tiempo.
// Requiere CRON_SECRET en el .env; sin él, este endpoint queda deshabilitado.
app.get('/internal/vip-expiry-check', async (req, res) => {
  if (!process.env.CRON_SECRET || req.query.token !== process.env.CRON_SECRET) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  try {
    const { checkExpiredVips } = require('./jobs/vip-expiry');
    const count = await checkExpiredVips();
    res.json({ ok: true, expiredProcessed: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { user: req.user, title: 'No encontrado', message: 'Ese expediente no existe.' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { user: req.user, title: 'Error', message: 'Algo se rompió en el expediente. Intenta de nuevo.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`Panel de Ligadores corriendo en ${publicUrl} (puerto ${PORT}, escuchando en todas las interfaces de red)`);
});

// Revisa cada 15 minutos si algún VIP venció, y si es así, le quita el rol
// de Discord automáticamente. Ver src/jobs/vip-expiry.js para más detalle.
require('./jobs/vip-expiry').startVipExpiryScheduler();
