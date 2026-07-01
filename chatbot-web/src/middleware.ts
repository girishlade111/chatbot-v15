export { auth as middleware } from '@/lib/auth/auth';

export const config = {
  matcher: ['/chat/:path*', '/settings/:path*', '/knowledge/:path*', '/prompts/:path*', '/admin/:path*'],
};
