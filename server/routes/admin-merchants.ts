import { Router } from "express";
import { adminUpdateMerchantSchema, type Merchant } from "@shared/schema";
import * as merchantStore from "../storage/merchants";
import { authenticate, requireRole } from "../lib/auth";
import { asyncHandler, parseBody, notFound } from "../lib/http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const adminMerchantsRouter = Router();
adminMerchantsRouter.use("/api/admin", authenticate, requireRole("admin"));

/**
 * Editing a merchant record from the admin merchants table. Mainly for map
 * coordinates: an outlet that never gets round to placing its own pin can be
 * placed for it, rather than being missing from the map indefinitely.
 *
 * It is also the only way `verifiesResidents` is ever set. That switch hands an
 * outlet the right to grant residency, so it belongs to whoever decided to trust
 * them, not to the outlet: the merchant's own route parses updateMerchantSchema,
 * which does not carry the field.
 */
const updateMerchant = asyncHandler(async (req, res) => {
  if (!UUID_RE.test(req.params.id)) throw notFound("Merchant not found");
  const input = parseBody(adminUpdateMerchantSchema, req.body);
  const values: Partial<Merchant> = { ...input };
  if (values.reservationUrl === "") values.reservationUrl = null;
  const merchant = await merchantStore.updateMerchant(req.params.id, values);
  if (!merchant) throw notFound("Merchant not found");
  res.json(merchant);
});

adminMerchantsRouter.put("/api/admin/merchants/:id", updateMerchant);
adminMerchantsRouter.patch("/api/admin/merchants/:id", updateMerchant);
