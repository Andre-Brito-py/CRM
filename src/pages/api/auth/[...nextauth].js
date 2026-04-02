import NextAuth from 'next-auth';

import { getAuthOptions } from '@/lib/server/auth';

export default async function handler(req, res) {
  const options = await getAuthOptions(req);
  return await NextAuth(req, res, options);
}
