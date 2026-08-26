'use client';
import { useEffect } from 'react';
import { initAppNotifications } from '@/utils/notifications';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAppNotifications();
  }, []);

  return <>{children}</>;
}