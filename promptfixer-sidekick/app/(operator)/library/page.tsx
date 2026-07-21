import { LibraryClient } from "@/components/LibraryClient";
import { OperatorPageHeader } from "@/components/OperatorPageHeader";

export const metadata = {
  title: "Library · operator.center",
  description: "Local Mission Receipt archive."
};

export default function LibraryPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <OperatorPageHeader
        eyebrow="library · local archive"
        title="Mission Receipts"
        sub="Every successful mission persists a compact receipt to this browser's localStorage. Receipts never leave your machine unless you explicitly share one."
      />
      <LibraryClient />
    </div>
  );
}
