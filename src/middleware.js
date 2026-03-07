import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host');

  let appUrl = process.env.APP_URL;
  if (!appUrl) {
    appUrl = 'http://localhost:3000';
  }

  const { host } = new URL(appUrl);

  const currentHost = hostname.replace(`.${host}`, '');

  if (pathname.startsWith(`/_sites`)) {
    return new Response(null, { status: 404 });
  }

  if (!pathname.includes('.') && !pathname.startsWith('/api')) {
    if (hostname === host) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${currentHost}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
