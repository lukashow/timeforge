/**
 * PocketBase Collection Setup Script (v0.23+)
 * 
 * Run this script to create all required collections in PocketBase.
 * Usage: bun run src/scripts/setup-collections.ts
 */

import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

// Admin credentials
const ADMIN_EMAIL = "admin@timetable.school.org";
const ADMIN_PASSWORD = "timetable123";

interface FieldDef {
  name: string;
  type: string;
  required?: boolean;
  options?: Record<string, unknown>;
}

async function createCollections() {
  console.log("Setting up PocketBase collections...");

  try {
    // Authenticate as admin
    await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("Authenticated as admin");
  } catch (error) {
    console.error("Failed to authenticate:", error);
    return;
  }

  // Delete existing collections to recreate with proper schema
  const collectionsToDelete = ["assignments", "classes", "disciplines", "teachers", "rooms", "subjects", "time_grid"];
  
  for (const name of collectionsToDelete) {
    try {
      const collection = await pb.collections.getOne(name);
      await pb.collections.delete(collection.id);
      console.log(`Deleted existing collection: ${name}`);
    } catch {
      // Collection doesn't exist, skip
    }
  }

  console.log("");

  // Collection definitions with proper PocketBase v0.23+ field format
  const collections: { name: string; type: string; fields: FieldDef[] }[] = [
    {
      name: "subjects",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "shortName", type: "text", required: true },
        { name: "color", type: "text", required: true },
        { name: "requiresLab", type: "bool" },
      ],
    },
    {
      name: "rooms",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "tags", type: "json" },
      ],
    },
    {
      name: "disciplines",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "category", type: "text", required: true },
        { name: "subjectAllocations", type: "json" },
        { name: "staticCourses", type: "json" },
      ],
    },
    {
      name: "time_grid",
      type: "base",
      fields: [
        { name: "workDays", type: "number", required: true },
        { name: "periodsPerDay", type: "number", required: true },
        { name: "breaks", type: "json" },
        { name: "daySchedules", type: "json" },
      ],
    },
  ];

  const createdCollections: Record<string, string> = {};

  // Create base collections first (no relations)
  for (const collectionDef of collections) {
    try {
      const created = await pb.collections.create({
        name: collectionDef.name,
        type: collectionDef.type,
        fields: collectionDef.fields,
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });

      createdCollections[collectionDef.name] = created.id;
      console.log(`Created collection: ${collectionDef.name}`);
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown } };
      console.error(`Failed to create ${collectionDef.name}:`, err.message || error);
      if (err.response?.data) {
        console.error("   Details:", JSON.stringify(err.response.data));
      }
    }
  }

  // Create teachers collection (needs subjects relation)
  try {
    const created = await pb.collections.create({
      name: "teachers",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "subject", type: "relation", required: true, options: { collectionId: createdCollections["subjects"], maxSelect: 1 } },
        { name: "weeklyLoad", type: "number", required: true },
        { name: "unavailable", type: "json" },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    createdCollections["teachers"] = created.id;
    console.log("Created collection: teachers");
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Failed to create teachers:", err.message || error);
  }

  // Create classes collection (needs disciplines and teachers relations)
  try {
    const created = await pb.collections.create({
      name: "classes",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "category", type: "text", required: true },
        { name: "discipline", type: "relation", options: { collectionId: createdCollections["disciplines"], maxSelect: 1 } },
        { name: "formTeacher", type: "relation", options: { collectionId: createdCollections["teachers"], maxSelect: 1 } },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    createdCollections["classes"] = created.id;
    console.log("Created collection: classes");
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Failed to create classes:", err.message || error);
  }

  // Create assignments collection (needs classes, subjects, teachers relations)
  try {
    const created = await pb.collections.create({
      name: "assignments",
      type: "base",
      fields: [
        { name: "class", type: "relation", required: true, options: { collectionId: createdCollections["classes"], maxSelect: 1 } },
        { name: "subject", type: "relation", required: true, options: { collectionId: createdCollections["subjects"], maxSelect: 1 } },
        { name: "teacher", type: "relation", options: { collectionId: createdCollections["teachers"], maxSelect: 1 } },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    createdCollections["assignments"] = created.id;
    console.log("Created collection: assignments");
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Failed to create assignments:", err.message || error);
  }

  console.log("Setup complete!");
  console.log("Collection IDs:", createdCollections);
}

createCollections();
