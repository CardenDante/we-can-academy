#!/usr/bin/env node

/**
 * Run Prisma migrations on container startup
 * This script executes migrations without requiring the full Prisma CLI
 */

const { spawn } = require('child_process');
const path = require('path');

async function runMigrations() {
  console.log('Running database migrations...');

  // Try to use the Prisma binary from node_modules
  const prismaBinary = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');

  return new Promise((resolve, reject) => {
    const prisma = spawn('node', [prismaBinary, 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    prisma.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Migrations completed successfully');
        resolve();
      } else {
        console.warn(`⚠ Migration process exited with code ${code}`);
        console.warn('Continuing startup - app may not work if schema is out of sync');
        resolve(); // Don't fail startup
      }
    });

    prisma.on('error', (err) => {
      console.error('Migration error:', err.message);
      console.warn('Continuing startup - app may not work if schema is out of sync');
      resolve(); // Don't fail startup
    });
  });
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('Failed to run migrations:', err);
    process.exit(0); // Don't fail the container, just warn
  });
}

module.exports = { runMigrations };
