import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';

export default function Home() {
  return null;
}

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: '/account',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: '/auth/login',
      permanent: false,
    },
  };
};

