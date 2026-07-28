const router = require('express').Router();
const { marked } = require('marked');
const { pool } = require('../config/db');
const { ensureAdmin } = require('../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------- Lectura pública ----------

router.get('/rules', async (req, res, next) => {
  try {
    const [articles] = await pool.query(
      `SELECT id, title, slug, category FROM wiki_articles ORDER BY category, position, title`
    );
    const byCategory = {};
    for (const a of articles) {
      byCategory[a.category] = byCategory[a.category] || [];
      byCategory[a.category].push(a);
    }
    res.render('rules-index', { user: req.user, title: 'Normativa', byCategory });
  } catch (err) {
    next(err);
  }
});

router.get('/rules/:slug', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM wiki_articles WHERE slug = ? LIMIT 1`, [req.params.slug]);
    if (!rows.length) {
      return res.status(404).render('error', {
        user: req.user,
        title: 'No encontrado',
        message: 'Ese artículo no existe.',
      });
    }
    const article = rows[0];
    res.render('rules-article', {
      user: req.user,
      title: article.title,
      article,
      html: marked.parse(article.content || ''),
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Administración (solo admins) ----------

router.get('/admin/wiki', ensureAdmin, async (req, res, next) => {
  try {
    const [articles] = await pool.query(`SELECT * FROM wiki_articles ORDER BY category, position, title`);
    res.render('admin-wiki-list', { user: req.user, title: 'Administrar normativa', articles });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/wiki/new', ensureAdmin, (req, res) => {
  res.render('admin-wiki-form', { user: req.user, title: 'Nuevo artículo', article: null });
});

router.post('/admin/wiki/new', ensureAdmin, async (req, res, next) => {
  try {
    const { title, category, content } = req.body;
    const slug = slugify(title);
    await pool.query(
      `INSERT INTO wiki_articles (title, slug, category, content, position, updated_by, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, NOW())`,
      [title, slug, category || 'General', content, req.user.username]
    );
    res.redirect('/admin/wiki');
  } catch (err) {
    next(err);
  }
});

router.get('/admin/wiki/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM wiki_articles WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.redirect('/admin/wiki');
    res.render('admin-wiki-form', { user: req.user, title: 'Editar artículo', article: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/wiki/:id/edit', ensureAdmin, async (req, res, next) => {
  try {
    const { title, category, content } = req.body;
    const slug = slugify(title);
    await pool.query(
      `UPDATE wiki_articles SET title = ?, slug = ?, category = ?, content = ?, updated_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, slug, category || 'General', content, req.user.username, req.params.id]
    );
    res.redirect('/admin/wiki');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/wiki/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM wiki_articles WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/wiki');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
