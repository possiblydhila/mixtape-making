import { notFound } from "next/navigation";
import { getMixtape } from "@/lib/store";
import MixtapeBuilder from "@/components/MixtapeBuilder";

// "Remix" seeds the builder from an existing tape but saves as a new mixtape.
export default function RemixMixtapePage({ params }: { params: { id: string } }) {
  const mixtape = getMixtape(params.id);
  if (!mixtape) notFound();
  return <MixtapeBuilder seed={mixtape} />;
}
