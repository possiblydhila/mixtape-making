import { notFound } from "next/navigation";
import { getMixtape } from "@/lib/store";
import MixtapeView from "@/components/MixtapeView";

export default function MixtapePage({ params }: { params: { id: string } }) {
  const mixtape = getMixtape(params.id);
  if (!mixtape) notFound();
  return <MixtapeView mixtape={mixtape} />;
}
