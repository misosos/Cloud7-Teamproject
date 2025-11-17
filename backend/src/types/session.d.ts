
// Turn this .d.ts into a module so its declarations don't pollute the global scope unintentionally
export {};

// Project-local namespace to avoid name collisions
declare namespace Auth {
  /**
   * Minimal user snapshot stored in the server-side session and exposed on req.currentUser
   */
  interface SessionUser {
    id: string;
    email: string;
    name?: string;
    role?: 'user' | 'admin';
  }
}

// Augment express-session to include our user snapshot on SessionData
declare module 'express-session' {
  interface SessionData {
    /** Minimal user snapshot persisted in the session */
    user?: Auth.SessionUser;
  }
}

// Augment Express.Request so middlewares/controllers can use req.currentUser safely
declare global {
  namespace Express {
    interface Request {
      /** Current logged-in user injected by auth middleware (from req.session.user) */
      currentUser?: Auth.SessionUser;
    }
  }
}