"use client";

import { useParams } from "next/navigation";
import { LibraryView } from "@/components/library";

export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  return <LibraryView folderId={id} />;
}
