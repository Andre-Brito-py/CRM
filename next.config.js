const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  importScripts: ['/worker/push.js'],
});

module.exports = withPWA({
  images: {
    domains: [''],
  },
  reactStrictMode: true,
});
