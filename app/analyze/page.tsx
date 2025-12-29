import AnalyzeClient from './AnalyzeClient'

export const metadata = {
  title: 'Analyze — Propaganda Buster by BFMbreakdown',
}

export default function Page() {
  return (
    <main className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Analyze text for propaganda and persuasion</h1>
        <AnalyzeClient />
      </div>
    </main>
  )
}
