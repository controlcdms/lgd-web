import { redirect } from "next/navigation";

export default function SignInRedirect() {
  // Default to Spanish route; the i18n middleware may also rewrite.
  redirect("/es/auth/signin");
}
