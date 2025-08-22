import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/docs/en'); }, [router]); // basePath + locale
  return null;
}