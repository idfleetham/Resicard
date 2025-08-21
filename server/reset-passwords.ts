import bcrypt from "bcrypt";
import { storage } from "./storage";

async function resetTestPasswords() {
  console.log("Resetting test user passwords...");

  const testUsers = [
    { email: "admin@resicard.com", password: "admin1234", role: "admin", username: "admin" },
    { email: "merchant@resicard.com", password: "merchant1234", role: "merchant", username: "merchant" },
    { email: "user@resicard.com", password: "user1234", role: "resident", username: "user" }
  ];

  for (const testUser of testUsers) {
    try {
      // Check if user exists
      const existingUser = await storage.getUserByEmail(testUser.email);
      
      if (existingUser) {
        // Update existing user password
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        await storage.updateUser(existingUser.id, { password: hashedPassword });
        console.log(`✓ Updated password for ${testUser.email}`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        await storage.createUser({
          username: testUser.username,
          email: testUser.email,
          password: hashedPassword,
          role: testUser.role,
          postcode: testUser.role === 'resident' ? 'KY16 9AJ' : undefined,
          businessName: testUser.role === 'merchant' ? 'Test Business' : undefined,
          businessCategory: testUser.role === 'merchant' ? 'Food & Drink' : undefined,
        });
        console.log(`✓ Created new user ${testUser.email}`);
      }
    } catch (error) {
      console.error(`✗ Failed to reset password for ${testUser.email}:`, error);
    }
  }

  console.log("Password reset complete!");
}

// Run the password reset
resetTestPasswords().catch(console.error);

export { resetTestPasswords };