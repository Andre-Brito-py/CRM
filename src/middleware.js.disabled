import { NextResponse } from 'next/server';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const hostnameWithoutPort = hostname.includes(':') ? hostname.split(':')[0] : hostname;
  
  // LOG FOR DEBUGGING (USER CAN SEE IN VERCEL)
  console.log(`[DEBUG_MIDDLEWARE] Host: ${hostnameWithoutPort}, Path: ${pathname}`);

  // 0. EXPLICIT PRODUCTION DOMAIN BYPASS (DEBUG)
  if (hostnameWithoutPort.includes('vysify.com')) {
    return NextResponse.next();
  }

  let appUrl = process.env.APP_URL;
  if (!appUrl) appUrl = 'https://vysify.com';
  const appHostname = new URL(appUrl).hostname;

  // 1. Direct pass for main domain, localhost or vercel app subdomains
  if (
    hostnameWithoutPort === appHostname || 
    hostnameWithoutPort === 'localhost' || 
    hostnameWithoutPort === '127.0.0.1' ||
    (hostnameWithoutPort.endsWith('.vercel.app') && !hostnameWithoutPort.includes('-')) // Simple heuristic
  ) {
    return NextResponse.next();
  }


  // 2. Multi-tenant logic only if not main domain
  const currentHost = hostnameWithoutPort.replace(`.${appHostname}`, '');
  const site = currentHost.trim().toLowerCase();

  if (pathname.startsWith(`/_sites`) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (!pathname.includes('.')) {
    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${site}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

