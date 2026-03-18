import "./globals.css";
import { ColorSchemeScript } from "@mantine/core";
import { Providers } from "./providers";
import { THEME } from "./theme";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mantine-color-scheme="dark"
      className={`theme-${THEME}`}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
