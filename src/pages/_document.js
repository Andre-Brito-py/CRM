import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('beforeinstallprompt', (e) => {
                  // Capture the prompt to prevent native browser behavior
                  e.preventDefault();
                  // Store it globally so our React component can use it later
                  window.__deferredPrompt = e;
                  
                  // If we are on the landing page, we definitely want to silene it
                  const isLanding = window.location.pathname === '/' || window.location.pathname.endsWith('/index');
                  console.log('PWA Event captured. Landing page:', isLanding);
                });
              `,
            }}
          />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon.png" />
          <meta name="theme-color" content="#2563EB" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Vysify" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="Vysify" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="msapplication-TileColor" content="#2563EB" />
          <meta name="msapplication-tap-highlight" content="no" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
