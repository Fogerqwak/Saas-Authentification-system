import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

if (config.google.clientID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: `${config.serverUrl}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value?.toLowerCase() ||
            `${profile.id}@oauth.local`;
          const name = profile.displayName || profile.name?.givenName || null;
          const avatar = profile.photos?.[0]?.value || null;

          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email },
                { provider: "google", providerId: profile.id },
              ],
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name,
                avatar,
                provider: "google",
                providerId: profile.id,
              },
            });
            const userRole = await prisma.role.findUnique({
              where: { name: "user" },
            });
            if (userRole) {
              await prisma.userRole.create({
                data: { userId: user.id, roleId: userRole.id },
              });
            }
          } else if (!user.providerId) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                name: name ?? user.name,
                avatar: avatar ?? user.avatar,
                provider: "google",
                providerId: profile.id,
              },
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

if (config.github.clientID) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.github.clientID,
        clientSecret: config.github.clientSecret,
        callbackURL: `${config.serverUrl}/api/auth/github/callback`,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
        try {
          const email =
            profile.emails?.[0]?.value?.toLowerCase() ||
            `${profile.id}@oauth.local`;
          const name = profile.displayName || profile.username || null;
          const avatar = profile.photos?.[0]?.value || null;

          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email },
                { provider: "github", providerId: profile.id },
              ],
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name,
                avatar,
                provider: "github",
                providerId: profile.id,
              },
            });
            const userRole = await prisma.role.findUnique({
              where: { name: "user" },
            });
            if (userRole) {
              await prisma.userRole.create({
                data: { userId: user.id, roleId: userRole.id },
              });
            }
          } else if (!user.providerId) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                name: name ?? user.name,
                avatar: avatar ?? user.avatar,
                provider: "github",
                providerId: profile.id,
              },
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});
