// passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,         // Web client ID from Google Cloud
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Client secret from Google Cloud
    callbackURL: '/auth/google/callback',          // Redirect URL after login
}, (accessToken, refreshToken, profile, done) => {
    // You can save user info to database here if needed
    // Example: User.findOrCreate({ googleId: profile.id }, (err, user) => done(err, user));
    done(null, profile);
}));

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});
