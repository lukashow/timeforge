/**
 * Recreate time_grid collection with proper schema (PocketBase v0.23+)
 * Run with: bun run src/scripts/recreate-time-grid.ts
 */
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function recreateTimeGrid() {
  try {
    // Authenticate as admin
    await pb.admins.authWithPassword('admin@timetable.school.org', 'timetable123');
    console.log('Authenticated as admin');

    // Try to delete existing collection
    try {
      const existing = await pb.collections.getOne('time_grid');
      console.log('Deleting existing time_grid collection...');
      await pb.collections.delete(existing.id);
      console.log('Deleted old collection');
    } catch {
      console.log('No existing time_grid collection found');
    }

    // Create new collection with full schema (v0.23+ uses 'fields' not 'schema')
    console.log('Creating new time_grid collection...');
    const newCollection = await pb.collections.create({
      name: 'time_grid',
      type: 'base',
      fields: [
        {
          name: 'workDays',
          type: 'number',
          required: false,
          min: 1,
          max: 7,
        },
        {
          name: 'periodsPerDay',
          type: 'number',
          required: false,
          min: 2,
          max: 15,
        },
        {
          name: 'breaks',
          type: 'json',
          required: false,
          maxSize: 5000000,
        },
        {
          name: 'daySchedules',
          type: 'json',
          required: false,
          maxSize: 5000000,
        },
        {
          name: 'selectedDays',
          type: 'json',
          required: false,
          maxSize: 5000000,
        },
        {
          name: 'schoolStartDate',
          type: 'text',
          required: false,
        },
        {
          name: 'schoolStartTime',
          type: 'text',
          required: false,
        },
        {
          name: 'minutesPerPeriod',
          type: 'number',
          required: false,
          min: 20,
          max: 90,
        },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
    });

    console.log('Created time_grid collection:', newCollection.id);
    console.log('Schema fields:', newCollection.fields || newCollection.schema);

    // Create default record
    console.log('Creating default time_grid record...');
    const record = await pb.collection('time_grid').create({
      workDays: 5,
      periodsPerDay: 8,
      breaks: [],
      daySchedules: {},
      selectedDays: [0, 1, 2, 3, 4],
      schoolStartDate: '2026-09-01',
      schoolStartTime: '08:00',
      minutesPerPeriod: 45,
    });
    console.log('Created default record:', record.id);

    // Verify
    const check = await pb.collection('time_grid').getFullList();
    console.log('Verification - record:', JSON.stringify(check[0], null, 2));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recreateTimeGrid();
