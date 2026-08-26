// Small client component to handle the useEffect hook since RootLayout is a Server Component by default
("use client");
import { useEffect } from "react";
import { initAppNotifications } from "@/utils/notifications";

function NotificationRunner() {
  useEffect(() => {
    initAppNotifications();
  }, []);

  return null;
}