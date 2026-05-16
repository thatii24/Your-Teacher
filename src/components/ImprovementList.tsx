import type { ImprovementArea } from "@/lib/openai";

export default function ImprovementList({
  items,
}: {
  items: ImprovementArea[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-6 text-center text-sm text-ink-400">
        No improvement areas were identified. Try a more in-depth session.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item, idx) => (
        <li
          key={`${idx}-${item.area}`}
          className="rounded-2xl border border-ink-800/70 bg-ink-900/40 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-semibold text-white">
              {idx + 1}
            </span>
            <div className="min-w-0">
              <div className="font-medium text-ink-50">{item.area}</div>
              <div className="mt-1 text-sm text-ink-400 leading-relaxed">
                {item.why}
              </div>
              <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950/60 px-3 py-2 text-sm text-ink-200">
                <span className="text-ink-500 text-xs uppercase tracking-wider mr-2">
                  Next step
                </span>
                {item.suggestedNextStep}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
