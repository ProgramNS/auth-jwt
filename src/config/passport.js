const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        provider: true,
        providerId: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { providerId: profile.id, provider: 'google' },
          { email: profile.emails[0].value },
        ],
      },
    });

    if (user) {
      // User exists, update their information if needed
      if (user.provider === 'local' && !user.providerId) {
        // Link existing local account with Google
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider: 'google',
            providerId: profile.id,
            profilePicture: profile.photos[0]?.value || user.profilePicture,
            isEmailVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Update last login time
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            profilePicture: profile.photos[0]?.value || user.profilePicture,
          },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profilePicture: profile.photos[0]?.value,
          provider: 'google',
          providerId: profile.id,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

module.exports = passport;
