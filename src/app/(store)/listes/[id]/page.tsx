import type { Metadata } from "next";
import { ListEditor } from "@/components/lists/list-editor";

export const metadata: Metadata = { title: "Liste de courses", robots: { index: false } };

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6">
      <ListEditor listId={id} />
    </div>
  );
}
