import { Router } from "express";
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { registerSchema, loginSchema } from "@shared/schema";
import { db } from "../db";
import { config } from "../config";
import { emailService } from "../email";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import { signToken, authenticate, toPublicUser, currentUser } from "../lib/auth";
import { asyncHandler, parseBody, badRequest, conflict, forbidden } from "../lib/http";
import { isLocalPostcode, normalisePostcode } from "../lib/postcode";
import { uniqueScanCode } from "../lib/scan-code";

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string().min(16), password: z.string().min(8) });
const registerAdminSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  setupSecret: z.string().min(1),
});

export async function assertIdentityAvailable(email: string, username: string): Promise<void> {
  if (await userStore.getUserByEmail(email)) throw conflict("An account with that email already exists");
  if (await userStore.getUserByUsername(username)) throw conflict("That username is already taken");
}

export const authRouter = Router();

authRouter.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    if (input.role === "resident" && !isLocalPostcode(input.postcode)) {
      throw badRequest("Postcode is outside the Resicard area");
    }
    await assertIdentityAvailable(input.email, input.username);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    if (input.role === "resident") {
      const user = await userStore.createUser({
        username: input.username,
        email: input.email.toLowerCase(),
        password: passwordHash,
        firstName: input.firstName,
        surname: input.surname,
        role: "resident",
        postcode: normalisePostcode(input.postcode),
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        town: input.town,
        profilePhoto: input.profilePhoto ?? null,
        membershipStatus: "inactive",
        isResidencyVerified: false,
      });
      res.status(201).json({ user: toPublicUser(user), token: signToken(user) });
      return;
    }

    // Merchant: user row, then merchant row, then link the user to the merchant.
    const user = await db.transaction(async (tx) => {
      const owner = await userStore.createUser(
        {
          username: input.username,
          email: input.email.toLowerCase(),
          password: passwordHash,
          firstName: input.firstName,
          surname: input.surname,
          role: "merchant",
        },
        tx,
      );
      const merchant = await merchantStore.createMerchant(
        {
          ownerUserId: owner.id,
          name: input.businessName,
          category: input.businessCategory,
          address: input.businessAddress,
          phone: input.businessPhone,
          email: input.email.toLowerCase(),
          scanCode: await uniqueScanCode(tx),
          status: "pending",
          planStatus: "free",
        },
        tx,
      );
      const linked = await userStore.updateUser(owner.id, { merchantId: merchant.id }, tx);
      return linked ?? owner;
    });
    res.status(201).json({ user: toPublicUser(user), token: signToken(user) });
  }),
);

authRouter.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await userStore.getUserByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password) : false;
    if (!user || !valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    res.json({ user: toPublicUser(user), token: signToken(user) });
  }),
);

authRouter.get(
  "/api/auth/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const auth = currentUser(req);
    const user = await userStore.getUserById(auth.id);
    if (!user) {
      res.status(401).json({ message: "Account no longer exists" });
      return;
    }
    const merchant = user.merchantId ? await merchantStore.getMerchantById(user.merchantId) : undefined;
    res.json({ ...toPublicUser(user), merchant: merchant ?? undefined });
  }),
);

authRouter.post(
  "/api/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    // Always respond the same way so the endpoint cannot be used to find accounts.
    const message = "If an account with that email exists, a password reset link has been sent";
    if (!parsed.success) {
      res.json({ message });
      return;
    }
    const user = await userStore.getUserByEmail(parsed.data.email);
    if (user) {
      await userStore.revokePasswordResetTokens(user.id);
      const token = randomBytes(32).toString("hex");
      await userStore.insertPasswordResetToken({
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        requestIp: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      });
      await emailService.sendPasswordReset(user.email, `${config.publicBaseUrl}/reset-password?token=${token}`, user.username);
    }
    res.json({ message });
  }),
);

authRouter.post(
  "/api/auth/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = parseBody(resetPasswordSchema, req.body);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const ok = await db.transaction(async (tx) => {
      const row = await userStore.findLivePasswordResetToken(tokenHash, tx);
      if (!row) return false;
      await userStore.markPasswordResetTokenUsed(row.id, tx);
      await userStore.updateUser(row.userId, { password: passwordHash }, tx);
      await userStore.revokePasswordResetTokens(row.userId, tx);
      return true;
    });
    if (!ok) throw badRequest("Invalid or expired reset token");
    res.json({ message: "Password reset. You can now log in with your new password" });
  }),
);

authRouter.post(
  "/api/auth/register-admin",
  asyncHandler(async (req, res) => {
    const input = parseBody(registerAdminSchema, req.body);
    if (!config.adminSetupSecret || input.setupSecret !== config.adminSetupSecret) {
      throw forbidden("Admin setup is not enabled or the secret is wrong");
    }
    await assertIdentityAvailable(input.email, input.username);
    const user = await userStore.createUser({
      username: input.username,
      email: input.email.toLowerCase(),
      password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      firstName: input.firstName,
      surname: input.surname,
      role: "admin",
    });
    res.status(201).json({ user: toPublicUser(user), token: signToken(user) });
  }),
);
