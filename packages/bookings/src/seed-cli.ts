// npm run db:seed: adds the sample catalogue to the booking database (development and first setup).
import { databaseUrl } from "./db.ts";
import { seedCatalogue } from "./seed.ts";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Refusing to seed in production. Pass --force if you really mean it.");
  process.exit(1);
}

await seedCatalogue();
console.log(`Sample catalogue added to ${new URL(databaseUrl()).host}`);
process.exit(0);
