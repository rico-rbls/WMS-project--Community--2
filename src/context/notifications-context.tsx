import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { db, COLLECTIONS } from "@/lib/firebase";
import type { Notification } from "@/types";
import { useAuth } from "./auth-context";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => Promise<void>;
  isLoading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Only Owner and Admin can see notifications
  const canSeeNotifications = user?.role === "Owner" || user?.role === "Admin";

  // Real-time listener for notifications
  useEffect(() => {
    if (!canSeeNotifications) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Filter notifications by target roles
          if (user?.role && data.targetRoles?.includes(user.role)) {
            notifs.push({
              id: doc.id,
              type: data.type,
              title: data.title,
              message: data.message,
              salesOrderId: data.salesOrderId,
              customerName: data.customerName,
              createdBy: data.createdBy,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              read: data.read || false,
              readAt: data.readAt?.toDate?.()?.toISOString() || data.readAt,
              targetRoles: data.targetRoles,
            });
          }
        });
        setNotifications(notifs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [canSeeNotifications, user?.role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(notifRef, {
        read: true,
        readAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifs = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifs.map((n) => {
          const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, n.id);
          return updateDoc(notifRef, {
            read: true,
            readAt: Timestamp.now(),
          });
        })
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [notifications]);

  const createNotification = useCallback(
    async (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
      try {
        const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
        await addDoc(notificationsRef, {
          ...notification,
          createdAt: Timestamp.now(),
          read: false,
        });
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    },
    []
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        createNotification,
        isLoading,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}

