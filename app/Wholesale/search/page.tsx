"use client";

import { useRouter } from "next/navigation";
import SearchModal from "@/Components/search";

export default function SearchPage() {
  const router = useRouter();

  return (
    <SearchModal
      isOpen={true}
      onClose={() => router.back()}
    />
  );
}