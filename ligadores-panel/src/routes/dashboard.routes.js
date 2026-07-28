const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { getCharacterData } = require('../config/db');

router.get('/dashboard', ensureAuth, async (req, res, next) => {
  try {
    const character = await getCharacterData(req.user.id);
    res.render('dashboard', {
      user: req.user,
      title: 'Mi expediente',
      character, // null si el Discord aún no está vinculado a ningún personaje in-game
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
