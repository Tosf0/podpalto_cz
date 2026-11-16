"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PreferencesProvider } from "./preferences-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <PreferencesProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
