import { useQuery } from "@tanstack/react-query";

interface PreviewMode {
  preview: boolean;
  town: string;
}

/**
 * Shown on public pages while the site is carrying demo data.
 *
 * The landing page lists offers to anyone, so a seeded demo puts outlets on a
 * public website that have not agreed to be there and do not exist. Saying so
 * plainly costs nothing when showing the product to a prospective merchant, and
 * it stops a passing resident joining on the strength of an offer they cannot use.
 */
export default function PreviewNotice({ className = "" }: { className?: string }) {
  const { data } = useQuery<PreviewMode>({ queryKey: ["/api/preview-mode"] });
  if (!data?.preview) return null;

  return (
    <div className={className}>
      <div className="bg-sand rounded-2xl px-5 py-4">
        <p className="text-sm text-sea">
          <span className="font-bold">Preview.</span> Resicard is not open in {data.town} yet. The outlets and
          offers shown here are examples, used to demonstrate how the card works. No business listed has signed up.
        </p>
      </div>
    </div>
  );
}
