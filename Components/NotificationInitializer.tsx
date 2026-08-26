'use client';

import { useEffect } from 'react';
import { initAppNotifications } from '@/utils/notifications';

export default function NotificationInitializer() {
  useEffect(() => {
    initAppNotifications();
  }, []);

  return null;
}