const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');

const scopes = ['identify']; // agrega 'guilds' si necesitas verificar membresía al Discord del server

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: scopes,
}, (accessToken, refreshToken, profile, done) => {
  // `profile` trae: id, username, discriminator, avatar, email (si el scope lo incluye)
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const user = {
    id: profile.id,
    username: profile.username,
    discriminator: profile.discriminator,
    avatar: profile.avatar,
    avatarURL: profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${Number(profile.discriminator) % 5}.png`,
    isAdmin: adminIds.includes(profile.id),
  };

  return done(null, user);
}));

module.exports = passport;
