import Link from "next/link";
import { encounterList } from "@/lib/encounter-scripts";

export function EmergencySection() {
  return (
    <section
      id="emergency"
      className="bg-gradient-to-b from-[#7f1d1d] to-[#991b1b] px-4 py-14 sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-red-200">
          Emergency Mode
        </div>
        <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          If You Are Currently in a Police Encounter
        </h2>
        <p className="mt-3 text-base font-medium text-red-100">
          Select your situation. Get the exact script. Read carefully, stay calm.
        </p>

        {/* Encounter buttons */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {encounterList.map((item) => (
            <Link
              key={item.slug}
              href={`/encounter/${item.slug}`}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-5 text-center font-bold text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/20 active:scale-95"
            >
              <span className="text-3xl">{item.emoji}</span>
              <span className="text-sm leading-snug">{item.title}</span>
            </Link>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4">
          <p className="text-sm font-medium text-red-100">
            <span className="font-bold text-white">Remember:</span> Stay calm. Do not argue. Do not resist. Your challenge to any unlawful action happens in court — not on the street. Document everything you can remember immediately afterward.
          </p>
        </div>
      </div>
    </section>
  );
}
