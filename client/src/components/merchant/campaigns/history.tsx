import { EmptyNote, Panel, Pill, SectionTitle, TD, TH, TR, type PillTone } from "../portal-ui";
import { AUDIENCE_LABELS, londonMoment, type CampaignRow, type CampaignStatus } from "./types";

/** What has gone out, including the ones that did not. */

const STATUS_TONES: Record<CampaignStatus, PillTone> = {
  queued: "sand",
  sending: "slate",
  sent: "live",
  failed: "red",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  failed: "Not sent",
};

export default function CampaignHistory({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) {
    return (
      <Panel className="space-y-3">
        <SectionTitle>Sent</SectionTitle>
        <EmptyNote>Nothing sent yet.</EmptyNote>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-3">
      <SectionTitle>Sent</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr>
              <th className={TH}>When</th>
              <th className={TH}>Offer</th>
              <th className={TH}>Message</th>
              <th className={TH}>Who</th>
              <th className={TH}>Reached</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className={TR}>
                <td className={`${TD} whitespace-nowrap`}>{londonMoment(c.sentAt ?? c.scheduledFor)}</td>
                <td className={TD}>{c.offerTitle}</td>
                <td className={`${TD} max-w-[20rem]`}>{c.body}</td>
                <td className={`${TD} text-[#0F3B47]/70`}>{AUDIENCE_LABELS[c.audience]}</td>
                <td className={TD}>{c.status === "sent" ? (c.recipients ?? 0) : "-"}</td>
                <td className={TD}>
                  <Pill tone={STATUS_TONES[c.status]}>{STATUS_LABELS[c.status]}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#0F3B47]/70">
        A campaign is not sent if the offer stopped being live before it went out.
      </p>
    </Panel>
  );
}
