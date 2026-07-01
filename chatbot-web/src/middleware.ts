import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized({ token }) {
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/chat/:path*', '/settings/:path*', '/knowledge/:path*', '/prompts/:path*', '/admin/:path*'],
};
