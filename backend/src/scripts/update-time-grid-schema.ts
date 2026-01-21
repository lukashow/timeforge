/**
 * Update time_grid collection with new fields
 * Run with: bun run src/scripts/update-time-grid-schema.ts
 */
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function updateTimeGridSchema() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword('admin@timetable.school.org', 'timetable123');
    console.log('✅ Authenticated as admin');

    // Get the time_grid collection
    let collection;
    try {
      collection = await pb.collections.getOne('time_grid');
      console.log('📋 Found time_grid collection:', collection.id);
    } catch {
      console.log('❌ time_grid collection not found');
      return;
    }

    // Define full schema with all fields
    const fullSchema = [
      {
        name: 'workDays',
        type: 'number',
        required: false,
        options: {
          min: 4,
          max: 7,
        },
      },
      {
        name: 'periodsPerDay',
        type: 'number',
        required: false,
        options: {
          min: 2,
          max: 15,
        },
      },
      {
        name: 'breaks',
        type: 'json',
        required: false,
        options: {},
      },
      {
        name: 'daySchedules',
        type: 'json',
        required: false,
        options: {},
      },
      {
        name: 'selectedDays',
        type: 'json',
        required: false,
        options: {},
      },
      {
        name: 'schoolStartDate',
        type: 'text',
        required: false,
        options: {},
      },
      {
        name: 'schoolStartTime',
        type: 'text',
        required: false,
        options: {},
      },
      {
        name: 'minutesPerPeriod',
        type: 'number',
        required: false,
        options: {
          min: 20,
          max: 90,
        },
      },
    ];

    console.log('🔄 Updating collection schema...');
    
    // Update collection with full schema
    await pb.collections.update(collection.id, {
      schema: fullSchema,
    });

    console.log('✅ Successfully updated time_grid schema!');

    // Verify the update
    const updatedCollection = await pb.collections.getOne('time_grid');
    const fieldNames = (updatedCollection.schema || []).map((f: any) => f.name);
    console.log('📋 Updated fields:', fieldNames);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateTimeGridSchema();
