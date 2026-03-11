const { withSentryConfig } = require('@sentry/nextjs');

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  importScripts: ['/worker/push.js'],
});

const moduleExports = withPWA({
  images: {
    domains: [''],
  },
  reactStrictMode: true,
});

module.exports = withSentryConfig(
  moduleExports,
  {
    silent: true,
    org: process.env.SENTRY_ORG || "nextacular",
    project: process.env.SENTRY_PROJECT || "nextacular",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
