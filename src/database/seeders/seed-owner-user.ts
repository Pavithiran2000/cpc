import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { PortalUser, Tenant } from '../entities';
import { PortalRole } from '../../common/enums/portal-role.enum';

/**
 * Seeder to inject an owner user for the default tenant.
 * This is useful for testing authenticated E2E flows without running the full migration seed.
 *
 * Usage:
 *   SEED_OWNER=true npm run seed:owner
 * Or with custom credentials:
 *   DEMO_STATION_CODE=CPC001 OWNER_EMAIL=owner@demo.cpc OWNER_PASSWORD=Owner12345! npm run seed:owner
 */

async function seed() {
  await dataSource.initialize();
  const manager = dataSource.manager;

  const stationCode = process.env.DEMO_STATION_CODE ?? 'CPC001';
  const ownerEmail = (process.env.OWNER_EMAIL ?? 'owner@demo.cpc').toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD ?? 'Owner12345!';
  const ownerName = process.env.OWNER_NAME ?? 'Demo Owner';

  const tenant = await manager.findOne(Tenant, { where: { stationCode } });
  if (!tenant) {
    console.error(`❌ Tenant with station code "${stationCode}" not found. Please run migrations first.`);
    await dataSource.destroy();
    process.exit(1);
  }

  const existingOwner = await manager.findOne(PortalUser, { where: { tenantId: tenant.id, email: ownerEmail } });
  if (existingOwner) {
    console.log(`✓ Owner user already exists: ${ownerEmail}`);
    await dataSource.destroy();
    return;
  }

  const ownerUser = await manager.save(
    manager.create(PortalUser, {
      tenantId: tenant.id,
      name: ownerName,
      email: ownerEmail,
      phone: process.env.OWNER_PHONE ?? '+94110000000',
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      portalRole: PortalRole.Owner,
      status: 'ACTIVE',
    }),
  );

  console.log(`✓ Owner user created successfully`);
  console.log(`  Email: ${ownerUser.email}`);
  console.log(`  Name: ${ownerUser.name}`);
  console.log(`  Tenant: ${tenant.stationCode} (${tenant.stationName})`);
  console.log(`  Role: ${ownerUser.portalRole}`);
  console.log(`  Status: ${ownerUser.status}`);

  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error('❌ Seeder failed:', error.message);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
