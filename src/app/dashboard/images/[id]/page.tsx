import { notFound } from "next/navigation";
import ImageDetailsClient from "./ImageDetailsClient";

export default async function ImageDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const imageId = Number(id);
  if (!Number.isFinite(imageId)) return notFound();

  return (
    <div className="p-6">
      <ImageDetailsClient imageId={imageId} tab={sp.tab || ""} />
    </div>
  );
}
