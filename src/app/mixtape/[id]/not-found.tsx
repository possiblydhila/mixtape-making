import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-4xl mb-2">Tape not found</h1>
      <p className="text-cream/50 mb-6">This mixtape doesn't exist, or the link is wrong.</p>
      <Link href="/" className="px-4 py-2 rounded-md bg-cream text-ink font-semibold">
        Make a mixtape
      </Link>
    </main>
  );
}
