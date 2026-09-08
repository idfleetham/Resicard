const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What counts as local?",
    a: "A local postcode plus a code we post to your address, or verification in person if you would rather do it that way.",
  },
  {
    q: "Do I need an app?",
    a: "No. Resicard works in your phone's browser and you can add it to your home screen. There is nothing to download.",
  },
  {
    q: "What does a business need?",
    a: "Nothing new. A printed poster on the counter and any staff phone to check a redemption.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. Residents move to Free at renewal and keep their points. Businesses can move to Free at any time.",
  },
  {
    q: "Who sees my data?",
    a: "Outlets see an alias when you redeem, never your name or your address.",
  },
];

export default function PricingFaq() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">Questions</h2>
      <dl className="bg-white rounded-2xl p-5 divide-y divide-[#E6E9E8]">
        {QUESTIONS.map(({ q, a }) => (
          <div key={q} className="py-4 first:pt-0 last:pb-0">
            <dt className="font-bold text-[15px] text-sea">{q}</dt>
            <dd className="text-[15px] leading-[1.45] text-slate-brand mt-1">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
