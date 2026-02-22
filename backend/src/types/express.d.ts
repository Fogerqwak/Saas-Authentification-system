declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      avatar: string | null;
      twoFactorEnabled: boolean;
      roleNames?: string[];
      permissions?: string[];
    }
  }
}

export {};
