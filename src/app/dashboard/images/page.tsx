import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default function ImagesLegacyPage() {
  redirect(`/${defaultLocale}/dashboard/images`);
}
