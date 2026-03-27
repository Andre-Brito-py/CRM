import { NextResponse } from 'next/server';

export default function middleware(req) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  
  // Get hostname from headers (more reliable behind Cloudflare)
  const hostname = req.headers.get('host') || '';
  const hostnameWithoutPort = hostname.includes(':') ? hostname.split(':')[0] : hostname;

  // 1. Direct pass for internal Next.js paths, API and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Load APP_URL and determine the main domain
  let appUrl = process.env.APP_URL;
  if (!appUrl) appUrl = 'https://vysify.com';
  const appHostname = new URL(appUrl).hostname;

  // 3. Bypass for main domain and standard environments
  if (
    hostnameWithoutPort === appHostname ||
    hostnameWithoutPort === 'www.' + appHostname ||
    hostnameWithoutPort === 'localhost' ||
    hostnameWithoutPort === '127.0.0.1' ||
    (hostnameWithoutPort.endsWith('.vercel.app') && !hostnameWithoutPort.split('.')[0].includes('-'))
  ) {
    return NextResponse.next();
  }

  // 4. Multi-tenant logic for subdomains
  // If hostname is "tenant.vysify.com" -> currentHost = "tenant"
  const currentHost = hostnameWithoutPort.replace(`.${appHostname}`, '');
  
  // If the host is exactly the appHostname, we already returned next() above.
  // If it's something else (like a preview URL with dashes), we return next() to avoid loops.
  if (currentHost === hostnameWithoutPort) {
    return NextResponse.next();
  }

  const site = currentHost.trim().toLowerCase();
  
  // Rewrite to the site-specific folder
  return NextResponse.rewrite(new URL(`/_sites/${site}${pathname}${url.search}`, req.url));
}
