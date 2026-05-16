import TopicForm from "@/components/TopicForm";

export default function HomePage() {
  return (
    <div className="pt-10 sm:pt-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-ink-700/80 bg-ink-900/60 px-3 py-1 text-xs text-ink-300 mb-5">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Live avatar tutor, one topic at a time
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-r from-white via-ink-100 to-ink-300 bg-clip-text text-transparent">
          Learn anything, face to face.
        </h1>
        <p className="mt-4 text-ink-300 text-base sm:text-lg">
          Tell the avatar what you want to learn. It asks you a few quick
          questions, adapts to your level, teaches exactly that topic, and
          stops once you have it. Then it tells you what to study next.
        </p>
      </div>

      <TopicForm />

      <div className="mt-10 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <FeatureCard
          step="1"
          title="You pick the topic"
          body="Anything specific you want to understand, from CAP theorem to the French Revolution."
        />
        <FeatureCard
          step="2"
          title="It teaches adaptively"
          body="Diagnostic questions first, then explanations and checks tuned to your level."
        />
        <FeatureCard
          step="3"
          title="Knows when to stop"
          body="When you've got it, the session ends and you get a list of what to explore next."
        />
      </div>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-800/70 bg-ink-900/40 p-5">
      <div className="flex items-center gap-2 text-xs text-ink-400 mb-2">
        <span className="size-5 inline-flex items-center justify-center rounded-full border border-ink-700 text-ink-300">
          {step}
        </span>
        <span className="uppercase tracking-wider">Step {step}</span>
      </div>
      <div className="font-medium text-ink-100">{title}</div>
      <div className="mt-1 text-sm text-ink-400">{body}</div>
    </div>
  );
}
