import Link from 'next/link';

export default function Home() {
  return (
    <main className="bg-cream text-ink mx-auto w-full max-w-3xl p-6">
      <h1 className="font-display text-3xl">Chorify</h1>
      <p className="text-muted mt-2">Household operating system — web scaffold online.</p>
      <Link href="/theme-preview" className="bg-terracotta text-terracotta-ink mt-6 inline-block rounded-md px-4 py-2">
        Open theme preview
      </Link>
    </main>
  );
}
