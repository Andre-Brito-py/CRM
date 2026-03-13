import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const hostnameWithoutPort = hostname.includes(':') ? hostname.split(':')[0] : hostname;
  const requestIdHeader = req.headers.get('x-request-id') || '';
  const requestId =
    requestIdHeader.trim().length > 0
      ? requestIdHeader.trim()
      : globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  if (
    process.env.NODE_ENV !== 'production' &&
    (hostnameWithoutPort === 'localhost' || hostnameWithoutPort === '127.0.0.1')
  ) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('x-request-id', requestId);
    return res;
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
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      res.headers.set('x-request-id', requestId);
      return res;
    }

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${currentHost}${pathname}`;
    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', requestId);
  return res;
}
