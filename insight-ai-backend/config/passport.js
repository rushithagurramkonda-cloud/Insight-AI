import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          githubId: profile.id,
        });

        if (!user) {
          user = await User.create({
            githubId: profile.id,
            githubUsername: profile.username,
            name: profile.displayName || profile.username,
            avatarUrl: profile.photos?.[0]?.value || null,
            encryptedGithubToken: accessToken,
            checklist: {
                githubConnected: true,
            },
          });
        } else {
          user.githubUsername = profile.username;
          user.name = profile.displayName || profile.username;
          user.avatarUrl = profile.photos?.[0]?.value || null;
          user.encryptedGithubToken = accessToken;
          user.checklist.githubConnected=true;
          user.lastActiveAt = new Date();

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error("GitHub authentication error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;