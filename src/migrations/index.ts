import * as migration_20261019_150554_baseline from './20261019_150554_baseline';
import * as migration_20261019_154800_phase1_bookings from './20261019_154800_phase1_bookings';
import * as migration_20261020_111046_faqs from './20261020_111046_faqs';
import * as migration_20261020_113152_privacy_global from './20261020_113152_privacy_global';
import * as migration_20261020_135236_indexes from './20261020_135236_indexes';
import * as migration_20261020_141755_event_setup from './20261020_141755_event_setup';

export const migrations = [
  {
    up: migration_20261019_150554_baseline.up,
    down: migration_20261019_150554_baseline.down,
    name: '20261019_150554_baseline',
  },
  {
    up: migration_20261019_154800_phase1_bookings.up,
    down: migration_20261019_154800_phase1_bookings.down,
    name: '20261019_154800_phase1_bookings',
  },
  {
    up: migration_20261020_111046_faqs.up,
    down: migration_20261020_111046_faqs.down,
    name: '20261020_111046_faqs',
  },
  {
    up: migration_20261020_113152_privacy_global.up,
    down: migration_20261020_113152_privacy_global.down,
    name: '20261020_113152_privacy_global',
  },
  {
    up: migration_20261020_135236_indexes.up,
    down: migration_20261020_135236_indexes.down,
    name: '20261020_135236_indexes',
  },
  {
    up: migration_20261020_141755_event_setup.up,
    down: migration_20261020_141755_event_setup.down,
    name: '20261020_141755_event_setup'
  },
];
