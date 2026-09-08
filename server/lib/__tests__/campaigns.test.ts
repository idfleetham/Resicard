import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_BODY_MAX,
  CAMPAIGN_MONTHLY_CAP,
  isValidCampaignBody,
  isWithinSendWindow,
  londonMonthKey,
  nextSendWindow,
  planCampaign,
} from "../campaigns";

// UTC instants that read as the given London wall clock.
// July is BST (UTC+1); January and December are GMT.
const bst = (day: number, hh: number, mm = 0, month = 6) => new Date(Date.UTC(2026, month, day, hh - 1, mm));
const gmt = (day: number, hh: number, mm = 0, month = 0) => new Date(Date.UTC(2026, month, day, hh, mm));
const at = (d: Date) => d.toISOString();

describe("the sending window", () => {
  it("lets an instant inside 08:00-20:00 go straight out, in winter and in summer", () => {
    expect(isWithinSendWindow(gmt(14, 8))).toBe(true);
    expect(isWithinSendWindow(gmt(14, 19, 59))).toBe(true);
    expect(nextSendWindow(gmt(14, 12))).toEqual(gmt(14, 12));
    expect(nextSendWindow(bst(14, 12))).toEqual(bst(14, 12));
  });

  it("excludes the edges: before 08:00 and from 20:00", () => {
    expect(isWithinSendWindow(gmt(14, 7, 59))).toBe(false);
    expect(isWithinSendWindow(gmt(14, 20))).toBe(false);
  });

  it("queues an early morning campaign for 08:00 the same day", () => {
    expect(at(nextSendWindow(gmt(14, 6, 30)))).toBe(at(gmt(14, 8)));
  });

  it("queues an evening campaign for 08:00 the next day", () => {
    expect(at(nextSendWindow(gmt(14, 22, 10)))).toBe(at(gmt(15, 8)));
    expect(at(nextSendWindow(gmt(14, 20)))).toBe(at(gmt(15, 8)));
  });

  it("rolls a late-night campaign over the end of the month", () => {
    expect(at(nextSendWindow(gmt(31, 23, 30)))).toBe(at(new Date(Date.UTC(2026, 1, 1, 8))));
  });

  // The point of the whole London-wall-clock approach: in summer London is
  // UTC+1, so 20:30 London is 19:30 UTC. A naive UTC hour check would treat it
  // as inside the window and push residents at half past eight in the evening.
  it("uses British Summer Time, not UTC, at the window edges", () => {
    const halfPastEightJuly = new Date(Date.UTC(2026, 6, 14, 19, 30)); // 20:30 London
    expect(isWithinSendWindow(halfPastEightJuly)).toBe(false);
    expect(at(nextSendWindow(halfPastEightJuly))).toBe(at(bst(15, 8)));

    const halfPastSevenJuly = new Date(Date.UTC(2026, 6, 14, 6, 30)); // 07:30 London
    expect(isWithinSendWindow(halfPastSevenJuly)).toBe(false);
    expect(at(nextSendWindow(halfPastSevenJuly))).toBe(at(bst(14, 8)));

    // And 08:00 London in summer is 07:00 UTC, not 08:00 UTC.
    expect(nextSendWindow(halfPastSevenJuly).getUTCHours()).toBe(7);
  });

  it("buckets an instant into its London month, not its UTC month", () => {
    // 00:30 on 1 July London is 23:30 on 30 June UTC.
    expect(londonMonthKey(new Date(Date.UTC(2026, 5, 30, 23, 30)))).toBe("2026-07");
    expect(londonMonthKey(gmt(31, 23, 30))).toBe("2026-01");
  });
});

describe("planCampaign with no history", () => {
  it("allows an immediate send inside the window", () => {
    const plan = planCampaign([], gmt(14, 10));
    expect(plan.allowed).toBe(true);
    expect(plan.queued).toBe(false);
    expect(plan.reason).toBeNull();
    expect(at(plan.sendAt)).toBe(at(gmt(14, 10)));
  });

  it("allows but queues a send outside the window", () => {
    const plan = planCampaign([], gmt(14, 23));
    expect(plan.allowed).toBe(true);
    expect(plan.queued).toBe(true);
    expect(at(plan.sendAt)).toBe(at(gmt(15, 8)));
  });
});

describe("the seven day rule", () => {
  it("blocks a second campaign inside seven days", () => {
    const plan = planCampaign([{ sendAt: gmt(10, 12) }], gmt(14, 12));
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe("gap");
    expect(at(plan.nextAllowedAt)).toBe(at(gmt(17, 12)));
  });

  it("allows one exactly seven days later", () => {
    const plan = planCampaign([{ sendAt: gmt(10, 12) }], gmt(17, 12));
    expect(plan.allowed).toBe(true);
  });

  it("measures from the most recent campaign, whatever order they arrive in", () => {
    const plan = planCampaign([{ sendAt: gmt(2, 9) }, { sendAt: gmt(13, 9) }, { sendAt: gmt(6, 9) }], gmt(14, 12));
    expect(plan.allowed).toBe(false);
    expect(at(plan.nextAllowedAt)).toBe(at(gmt(20, 9)));
  });

  it("pushes the next allowed time into the window when seven days later is the middle of the night", () => {
    // Sent at 19:30, so seven days later is 19:30 — still inside the window.
    expect(planCampaign([{ sendAt: gmt(10, 19, 30) }], gmt(17, 19, 30)).allowed).toBe(true);
    // A queued campaign that went out at 08:00 gives 08:00, also inside.
    const plan = planCampaign([{ sendAt: gmt(10, 8) }], gmt(12, 12));
    expect(at(plan.nextAllowedAt)).toBe(at(gmt(17, 8)));
  });
});

describe("the monthly cap", () => {
  const four = [{ sendAt: gmt(1, 9) }, { sendAt: gmt(8, 9) }, { sendAt: gmt(15, 9) }, { sendAt: gmt(22, 9) }];

  it("counts four in a calendar month and then stops", () => {
    const plan = planCampaign(four, gmt(30, 12));
    expect(plan.sentThisMonth).toBe(CAMPAIGN_MONTHLY_CAP);
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe("monthly_cap");
  });

  it("offers the first day of the next month at 08:00 once the cap is reached", () => {
    const plan = planCampaign(four, gmt(30, 12));
    expect(at(plan.nextAllowedAt)).toBe(at(new Date(Date.UTC(2026, 1, 1, 8))));
  });

  it("resets on the calendar month boundary, not on a rolling thirty days", () => {
    // Four in January, and the last was 22 January, so by 1 February both the
    // gap and the cap have cleared.
    const plan = planCampaign(four, new Date(Date.UTC(2026, 1, 1, 12)));
    expect(plan.allowed).toBe(true);
    expect(plan.sentThisMonth).toBe(0);
  });

  it("still applies the seven day gap after a month rolls over", () => {
    const late = [...four.slice(0, 3), { sendAt: gmt(29, 9) }];
    const plan = planCampaign(late, new Date(Date.UTC(2026, 1, 2, 12)));
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe("gap");
    expect(at(plan.nextAllowedAt)).toBe(at(new Date(Date.UTC(2026, 1, 5, 9))));
  });

  it("uses the London month boundary, so a late-December send does not count against January", () => {
    // 23:30 on 31 December London. In UTC that is the same day, but the test
    // that matters is that it lands in December's bucket.
    const newYearEve = new Date(Date.UTC(2025, 11, 31, 23, 30));
    expect(londonMonthKey(newYearEve)).toBe("2025-12");
    const plan = planCampaign([{ sendAt: newYearEve }], new Date(Date.UTC(2026, 0, 8, 12)));
    expect(plan.allowed).toBe(true);
    expect(plan.sentThisMonth).toBe(0);
  });

  it("carries the cap across a British Summer Time month too", () => {
    const july = [
      { sendAt: bst(1, 9) },
      { sendAt: bst(8, 9) },
      { sendAt: bst(15, 9) },
      { sendAt: bst(22, 9) },
    ];
    const plan = planCampaign(july, bst(30, 12));
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toBe("monthly_cap");
    // 1 August 08:00 London is 07:00 UTC.
    expect(at(plan.nextAllowedAt)).toBe(at(new Date(Date.UTC(2026, 7, 1, 7))));
  });
});

describe("queueing combined with the limits", () => {
  it("queues to the next window when the gap clears in the middle of the night", () => {
    // Last sent at 02:00 (only possible in test data), so the gap clears at
    // 02:00 seven days later, which is outside the window.
    const plan = planCampaign([{ sendAt: gmt(10, 2) }], gmt(14, 12));
    expect(plan.allowed).toBe(false);
    expect(at(plan.nextAllowedAt)).toBe(at(gmt(17, 8)));
  });

  it("does not report a block just because the send is queued for the morning", () => {
    const plan = planCampaign([{ sendAt: gmt(1, 9) }], gmt(14, 22));
    expect(plan.allowed).toBe(true);
    expect(plan.queued).toBe(true);
    expect(plan.reason).toBeNull();
  });
});

describe("body copy", () => {
  it("caps at 140 characters and rejects empty copy", () => {
    expect(isValidCampaignBody("Quiet Tuesday, two for one on mains until nine.")).toBe(true);
    expect(isValidCampaignBody("a".repeat(CAMPAIGN_BODY_MAX))).toBe(true);
    expect(isValidCampaignBody("a".repeat(CAMPAIGN_BODY_MAX + 1))).toBe(false);
    expect(isValidCampaignBody("   ")).toBe(false);
  });
});
