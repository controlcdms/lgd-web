"use client";

import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
