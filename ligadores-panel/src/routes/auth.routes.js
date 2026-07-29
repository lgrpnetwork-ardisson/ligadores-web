const router = require('express').Router();
const passport = require('passport');

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login', { user: null, title: 'Iniciar sesión' });
});

router.get('/auth/discord', passport.authenticate('discord'));

router.get('/auth/discord/callback', (req, res, next) => {
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      console.error('Error de autenticación con Discord:', err);
      return res.redirect('/login');
    }
    if (!user) {
      console.error('Discord no devolvió usuario. Info:', info);
      return res.redirect('/login');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Error al guardar la sesión:', loginErr);
        return res.redirect('/login');
      }
      const redirectTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
