import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const hostnameWithoutPort = hostname.includes(':') ? hostname.split(':')[0] : hostname;

  if (
    process.env.NODE_ENV !== 'production' &&
    (hostnameWithoutPort === 'localhost' || hostnameWithoutPort === '127.0.0.1')
  ) {
    return NextResponse.next();
  }

  let appUrl = process.env.APP_URL;
  if (!appUrl) {
    appUrl = 'http://localhost:3000';
  }

  const appHostname = new URL(appUrl).hostname;

  const currentHost = hostnameWithoutPort.replace(`.${appHostname}`, '');

  if (pathname.startsWith(`/_sites`)) {
    return new Response(null, { status: 404 });
  }

  if (!pathname.includes('.') && !pathname.startsWith('/api')) {
    if (hostnameWithoutPort === appHostname) {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${currentHost}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
