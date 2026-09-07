// Creates an admin user. Usage: npm run admin:create -- <username> <email> <password>
import bcrypt from "bcrypt";
import { pool } from "../db";
import * as userStore from "../storage/users";

async function main(): Promise<void> {
  const [username, email, password] = process.argv.slice(2);
  if (!username || !email || !password) {
    console.error("Usage: npm run admin:create -- <username> <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }
  if (await userStore.getUserByEmail(email)) {
    console.error(`An account with email ${email} already exists`);
    process.exit(1);
  }
  if (await userStore.getUserByUsername(username)) {
    console.error(`Username ${username} is already taken`);
    process.exit(1);
  }
  const user = await userStore.createUser({
    username,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: "admin",
  });
  console.log(`Created admin user ${user.username} (id ${user.id})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
