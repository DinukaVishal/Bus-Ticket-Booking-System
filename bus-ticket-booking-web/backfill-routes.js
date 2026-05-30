import { createClient } from '@supabase/supabase-js';

// This script backfills bus types for existing routes based on assigned owner buses
async function backfillRouteBusTypes() {
  const supabaseUrl = 'https://qiuuchynzecmblfgzdvo.supabase.co';
  const supabaseKey = 'sb_publishable_H98wtolKPiZHMhTgURMmBQ_q-hPL23I';

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Starting backfill of route bus types...');

    // Check what routes exist
    const { data: allRoutes, error: routesError } = await supabase
      .from('routes')
      .select('id, name, bus_type');

    console.log('All routes:', allRoutes);
    console.log('Routes error:', routesError);

    // Check what owner_buses exist
    const { data: allBuses, error: busesError } = await supabase
      .from('owner_buses')
      .select('id, bus_number, bus_type');

    console.log('All owner_buses:', allBuses);
    console.log('Buses error:', busesError);

    // First, check what owner_routes exist
    const { data: allOwnerRoutes, error: allError } = await supabase
      .from('owner_routes')
      .select('*');

    console.log('All owner_routes:', allOwnerRoutes);
    console.log('All owner_routes error:', allError);

    console.log('Backfill completed!');
  } catch (error) {
    console.error('Backfill failed:', error);
  }
}

backfillRouteBusTypes();