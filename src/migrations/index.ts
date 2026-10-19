import * as migration_20261019_150554_baseline from './20261019_150554_baseline';
import * as migration_20261019_154800_phase1_bookings from './20261019_154800_phase1_bookings';

export const migrations = [
  {
    up: migration_20261019_150554_baseline.up,
    down: migration_20261019_150554_baseline.down,
    name: '20261019_150554_baseline',
  },
  {
    up: migration_20261019_154800_phase1_bookings.up,
    down: migration_20261019_154800_phase1_bookings.down,
    name: '20261019_154800_phase1_bookings'
  },
];
