/**
 * Update PocketBase Collection Rules
 * 
 * Sets API rules to allow unauthenticated access for development.
 * Usage: bun run src/scripts/update-rules.ts
 */

import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

// Admin credentials
const ADMIN_EMAIL = "admin@timetable.school.org";
const ADMIN_PASSWORD = "timetable123";

async function updateRules() {
  console.log("Updating PocketBase collection rules...");

  try {
    // Authenticate as admin
    await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("Authenticated as admin");
  } catch (error) {
    console.error("Failed to authenticate:", error);
    return;
  }

  const collections = [
    "subjects",
    "teachers",
    "rooms",
    "disciplines",
    "classes",
    "assignments",
    "time_grid",
  ];

  for (const collectionName of collections) {
    try {
      // Get collection by name
      const collection = await pb.collections.getOne(collectionName);
      
      // Update rules to allow public access
      await pb.collections.update(collection.id, {
        listRule: "",      // Allow public list
        viewRule: "",      // Allow public view
        createRule: "",    // Allow public create
        updateRule: "",    // Allow public update
        deleteRule: "",    // Allow public delete
      });

      console.log(`Updated rules for: ${collectionName}`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`Failed to update ${collectionName}:`, err.message || error);
    }
  }

  console.log("\nRules update complete!");
}

updateRules();
