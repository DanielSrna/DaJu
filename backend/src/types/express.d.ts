export interface AuthUser {
  id: string;
  rol: "admin" | "cliente";
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

export {};
