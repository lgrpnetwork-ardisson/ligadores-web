const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { pool } = require('../config/db');

async function isBossOf(discordId, jobId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM job_bosses WHERE discord_id = ? AND job_id = ? LIMIT 1`,
    [discordId, jobId]
  );
  return rows.length > 0;
}

// ---------- Vista del jugador ----------

router.get('/jobs', ensureAuth, async (req, res, next) => {
  try {
    const [jobs] = await pool.query(`SELECT * FROM jobs WHERE active = 1 ORDER BY label`);
    res.render('jobs-list', { user: req.user, title: 'Trabajos disponibles', jobs });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/mine', ensureAuth, async (req, res, next) => {
  try {
    const [applications] = await pool.query(
      `SELECT ja.*, j.label as job_label FROM job_applications ja
       JOIN jobs j ON j.id = ja.job_id
       WHERE ja.discord_id = ? ORDER BY ja.created_at DESC`,
      [req.user.id]
    );
    res.render('jobs-mine', { user: req.user, title: 'Mis postulaciones', applications });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/:id/apply', ensureAuth, async (req, res, next) => {
  try {
    const [jobs] = await pool.query(`SELECT * FROM jobs WHERE id = ? AND active = 1`, [req.params.id]);
    if (!jobs.length) return res.redirect('/jobs');

    const [existing] = await pool.query(
      `SELECT id FROM job_applications WHERE discord_id = ? AND job_id = ? AND status = 'pending'`,
      [req.user.id, req.params.id]
    );
    if (existing.length) return res.redirect('/jobs/mine');

    res.render('jobs-apply-form', { user: req.user, title: `Postular a ${jobs[0].label}`, job: jobs[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs/:id/apply', ensureAuth, async (req, res, next) => {
  try {
    const { full_name, age, motivation, experience } = req.body;
    await pool.query(
      `INSERT INTO job_applications
        (job_id, discord_id, discord_username, full_name, age, motivation, experience, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [req.params.id, req.user.id, req.user.username, full_name, age, motivation, experience || null]
    );
    res.redirect('/jobs/mine');
  } catch (err) {
    next(err);
  }
});

// ---------- Panel de jefes ----------

router.get('/jobs/boss', ensureAuth, async (req, res, next) => {
  try {
    let jobs;
    if (req.user.isAdmin) {
      [jobs] = await pool.query(`SELECT * FROM jobs ORDER BY label`);
    } else {
      [jobs] = await pool.query(
        `SELECT j.* FROM jobs j
         JOIN job_bosses jb ON jb.job_id = j.id
         WHERE jb.discord_id = ? ORDER BY j.label`,
        [req.user.id]
      );
    }

    if (!jobs.length) {
      return res.render('error', {
        user: req.user,
        title: 'Sin acceso',
        message: 'No eres jefe de ningún trabajo todavía.',
      });
    }

    for (const job of jobs) {
      const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) as count FROM job_applications WHERE job_id = ? AND status = 'pending'`,
        [job.id]
      );
      job.pendingCount = count;
    }

    res.render('jobs-boss-list', { user: req.user, title: 'Panel de jefe', jobs });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/boss/:jobId', ensureAuth, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!req.user.isAdmin && !(await isBossOf(req.user.id, jobId))) {
      return res.status(403).render('error', {
        user: req.user,
        title: 'Acceso denegado',
        message: 'No eres jefe de este trabajo.',
      });
    }

    const [[job]] = await pool.query(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    const [applications] = await pool.query(
      `SELECT * FROM job_applications WHERE job_id = ? AND status = 'pending' ORDER BY created_at ASC`,
      [jobId]
    );

    res.render('jobs-boss-review', { user: req.user, title: `Postulaciones — ${job.label}`, job, applications });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs/boss/:jobId/:applicationId/:decision', ensureAuth, async (req, res, next) => {
  try {
    const { jobId, applicationId, decision } = req.params;
    if (!req.user.isAdmin && !(await isBossOf(req.user.id, jobId))) {
      return res.status(403).render('error', {
        user: req.user,
        title: 'Acceso denegado',
        message: 'No eres jefe de este trabajo.',
      });
    }

    const status = decision === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      `UPDATE job_applications SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND job_id = ?`,
      [status, req.user.username, applicationId, jobId]
    );

    res.redirect(`/jobs/boss/${jobId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
