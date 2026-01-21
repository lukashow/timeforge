/**
 * Create collections with relations
 */

import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

const ADMIN_EMAIL = "admin@timetable.school.org";
const ADMIN_PASSWORD = "timetable123";

async function createRelationCollections() {
  console.log("🔧 Creating collections with relations...\n");

  await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("✅ Authenticated\n");

  // Get existing collection IDs
  const subjects = await pb.collections.getOne("subjects");
  const disciplines = await pb.collections.getOne("disciplines");

  console.log("subjects ID:", subjects.id);
  console.log("disciplines ID:", disciplines.id);

  // Create teachers with relation
  try {
    const created = await pb.collections.create({
      name: "teachers",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { 
          name: "subject", 
          type: "relation",
          options: { 
            collectionId: subjects.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        { name: "weeklyLoad", type: "number" },
        { name: "unavailable", type: "json" },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    console.log("✅ Created teachers, ID:", created.id);

    // Create classes
    const classes = await pb.collections.create({
      name: "classes",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "category", type: "text", required: true },
        { 
          name: "discipline", 
          type: "relation",
          options: { 
            collectionId: disciplines.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        { 
          name: "formTeacher", 
          type: "relation",
          options: { 
            collectionId: created.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    console.log("✅ Created classes, ID:", classes.id);

    // Create assignments
    const assignments = await pb.collections.create({
      name: "assignments",
      type: "base",
      fields: [
        { 
          name: "class", 
          type: "relation",
          required: true,
          options: { 
            collectionId: classes.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        { 
          name: "subject", 
          type: "relation",
          required: true,
          options: { 
            collectionId: subjects.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
        { 
          name: "teacher", 
          type: "relation",
          options: { 
            collectionId: created.id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });
    console.log("✅ Created assignments, ID:", assignments.id);

  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown; message?: string } };
    console.error("❌ Error:", err.message);
    if (err.response) {
      console.error("Response:", JSON.stringify(err.response, null, 2));
    }
  }

  console.log("\n🎉 Done!");
}

createRelationCollections();
