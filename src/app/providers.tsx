"use client";

import { SessionProvider } from "next-auth/react";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "dark",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MantineProvider
        theme={theme}
        forceColorScheme="dark"
        defaultColorScheme="dark"
      >
        {children}
      </MantineProvider>
    </SessionProvider>
  );
}
