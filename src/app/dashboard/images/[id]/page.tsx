import ImageDetailsClient from "./ImageDetailsClient";

export default async function ImageDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const p = await params;
  const sp = (await searchParams) || {};

  const id = Number(p.id);
  const tab = sp.tab || "";

  return (
    <div className="p-6">
      <ImageDetailsClient imageId={id} tab={tab} />
    </div>
  );
}
