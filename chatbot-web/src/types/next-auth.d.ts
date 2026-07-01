import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: 'user' | 'admin';
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'admin';
  }
}
