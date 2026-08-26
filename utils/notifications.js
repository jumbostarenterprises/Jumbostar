import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export const initAppNotifications = async () => {
  // Ensure this only runs on native Android/iOS devices, not regular mobile web
  if (!Capacitor.isNativePlatform()) return;

  try {
    // --- 1. LOCAL NOTIFICATIONS SETUP ---
    const localPerms = await LocalNotifications.checkPermissions();
    if (localPerms.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // --- 2. PUSH NOTIFICATIONS SETUP ---
    let pushPerms = await PushNotifications.checkPermissions();
    if (pushPerms.receive === 'prompt') {
      pushPerms = await PushNotifications.requestPermissions();
    }

    if (pushPerms.receive === 'granted') {
      // Register with FCM (Firebase Cloud Messaging)
      PushNotifications.register();
    }

    // Listen for the unique device registration token
    PushNotifications.addListener('registration', (token) => {
      console.log('Push Registration Token:', token.value);
      // TODO: You can pass this token.value and save it to your Supabase database 
      // linked to the logged-in user so you can send targeted push notifications later!
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on push registration:', error);
    });

    // Handle incoming push notifications when the app is open
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    // Handle action when user taps on the push notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
    });

  } catch (e) {
    console.error('Error initializing notifications:', e);
  }
};

// Function to trigger a test Local Notification anytime
export const triggerLocalReminder = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Jumbo Star Alert',
        body: 'This is your scheduled local notification reminder!',
        id: new Date().getTime(), // Unique ID
        schedule: { at: new Date(Date.now() + 5000) }, // Triggers after 5 seconds
        sound: undefined,
      },
    ],
  });
};