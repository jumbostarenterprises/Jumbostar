"use client";

import { useEffect } from "react";
import { initAppNotifications } from "@/utils/notifications";

// Ensure you have "export default" here:
export default function NotificationInitializer() {
  useEffect(() => {
    initAppNotifications();
  }, []);

  return null;
}