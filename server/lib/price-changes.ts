import { PRICE_CHANGE_FIELDS, type OfferType, type PriceChangeDirection, type PriceChangeField } from "@shared/schema";

/**
 * Works out what changed when a merchant saves an offer, so the figures behind
 * an offer can be read back later. The old values are overwritten by the update
 * itself, so if this is not recorded at the moment of the edit it is gone.
 *
 * Pure on purpose: the route decides the transaction, this decides the rows.
 */

/** Numeric columns come back from drizzle as strings, so both forms are accepted. */
export type PriceValue = string | number | null | undefined;

/** The watched figures, as they sit on an offer row or in an incoming update. */
export type PriceFields = Partial<Record<PriceChangeField, PriceValue>>;

export interface PriceChange {
  field: PriceChangeField;
  oldValue: number | null;
  newValue: number | null;
  direction: PriceChangeDirection;
  inflatesSaving: boolean;
}

/** Fields whose rise makes the advertised saving larger without the resident getting more. */
const HEADLINE_VALUE_FIELDS: readonly PriceChangeField[] = ["originalValue", "typicalSpend", "itemValue"];

/**
 * Numerics are stored to two decimal places, so "20.00", 20 and 20.001 are the
 * same figure. Comparing at that precision is what stops a re-save of an
 * untouched form recording a change.
 */
function toAmount(value: PriceValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null; // an emptied form field, not zero
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function directionOf(oldValue: number | null, newValue: number | null): PriceChangeDirection | null {
  if (oldValue === null && newValue === null) return null;
  if (oldValue === null) return "set";
  if (newValue === null) return "cleared";
  if (newValue > oldValue) return "up";
  if (newValue < oldValue) return "down";
  return null;
}

/**
 * True when the edit makes the offer read as a bigger saving without the
 * resident getting anything more. A rise in `fixedPrice` only counts on a money
 * -off offer, where it is the amount taken off; on a fixed-price offer the same
 * rise means the resident pays more, which is the offer getting worse.
 */
function inflatesSaving(field: PriceChangeField, direction: PriceChangeDirection, offerType: OfferType | null): boolean {
  if (direction !== "up") return false;
  if (HEADLINE_VALUE_FIELDS.includes(field)) return true;
  return field === "fixedPrice" && offerType === "fixed_amount_discount";
}

/**
 * The changes to record for one offer update. Fields absent from `incoming` were
 * not part of the submission and are left alone; a field present with the value
 * it already had records nothing.
 */
export function diffPriceFields(before: PriceFields, incoming: PriceFields, offerType: OfferType | null): PriceChange[] {
  const changes: PriceChange[] = [];
  for (const field of PRICE_CHANGE_FIELDS) {
    if (incoming[field] === undefined) continue;
    const oldValue = toAmount(before[field]);
    const newValue = toAmount(incoming[field]);
    const direction = directionOf(oldValue, newValue);
    if (!direction) continue;
    changes.push({ field, oldValue, newValue, direction, inflatesSaving: inflatesSaving(field, direction, offerType) });
  }
  return changes;
}

/**
 * The move as a fraction of the old figure: 20.00 to 25.00 is 0.25. Null when
 * there is nothing to divide by, so a value set from empty has no move rather
 * than an infinite one.
 */
export function percentMove(oldValue: PriceValue, newValue: PriceValue): number | null {
  const from = toAmount(oldValue);
  const to = toAmount(newValue);
  if (from === null || from === 0 || to === null) return null;
  return (to - from) / from;
}
