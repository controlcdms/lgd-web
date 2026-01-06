import ImageDetailsClient from "./ImageDetailsClient";

export default function ImageDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const id = Number(params.id);
  const tab = searchParams?.tab || "";
  return (
    <div className="p-6">
      <ImageDetailsClient imageId={id} tab={tab} />
    </div>
  );
}
