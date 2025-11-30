"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-green-500/50 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950/30 group-[.toaster]:text-green-700 dark:group-[.toaster]:text-green-400",
          error: "group-[.toaster]:border-red-500/50 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950/30 group-[.toaster]:text-red-700 dark:group-[.toaster]:text-red-400",
          warning: "group-[.toaster]:border-yellow-500/50 group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:bg-yellow-950/30 group-[.toaster]:text-yellow-700 dark:group-[.toaster]:text-yellow-400",
          info: "group-[.toaster]:border-blue-500/50 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950/30 group-[.toaster]:text-blue-700 dark:group-[.toaster]:text-blue-400",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
