function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  return res.status(403).render('error', {
    user: req.user,
    title: 'Acceso denegado',
    message: 'Esta sección es solo para administradores del expediente.',
  });
}

module.exports = { ensureAuth, ensureAdmin };
