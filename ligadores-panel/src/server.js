require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('./config/passport');
const path = require('path');

const app = express();

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
