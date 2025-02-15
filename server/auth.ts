import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false, // development 환경에서는 false로 설정
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
      httpOnly: true,
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Auth] Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log(`[Auth] Login failed for username: ${username}`);
          return done(null, false);
        }
        console.log(`[Auth] Login successful for username: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error(`[Auth] Error during login:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Auth] Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`[Auth] User not found for id: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error(`[Auth] Error during deserialization:`, error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`[Auth] Registration attempt for username: ${req.body.username}`);
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`[Auth] Registration failed - username already exists: ${req.body.username}`);
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      console.log(`[Auth] Registration successful for username: ${user.username}`);
      req.login(user, (err) => {
        if (err) {
          console.error(`[Auth] Login error after registration:`, err);
          return next(err);
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error(`[Auth] Registration error:`, error);
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log(`[Auth] Login successful for user: ${req.user?.username}`);
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user?.username;
    console.log(`[Auth] Logout attempt for user: ${username}`);
    req.logout((err) => {
      if (err) {
        console.error(`[Auth] Logout error:`, err);
        return next(err);
      }
      console.log(`[Auth] Logout successful for user: ${username}`);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[Auth] /api/user called. Authenticated: ${req.isAuthenticated()}`);
    if (!req.isAuthenticated()) {
      console.log(`[Auth] /api/user unauthorized access`);
      return res.sendStatus(401);
    }
    console.log(`[Auth] /api/user successful for user: ${req.user?.username}`);
    res.json(req.user);
  });
}