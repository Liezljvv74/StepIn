import * as migration_20261019_150554_baseline from './20261019_150554_baseline';

export const migrations = [
  {
    up: migration_20261019_150554_baseline.up,
    down: migration_20261019_150554_baseline.down,
    name: '20261019_150554_baseline'
  },
];
