import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { PlatformAdmin, PlatformRole, PlatformAdminStatus } from '../entities';

async function seed() {
  await dataSource.initialize();
  const manager = dataSource.manager;

  const email = (process.env.PLATFORM_ADMIN_SEED_EMAIL ?? 'admin@cpc-platform.local').toLowerCase();
  const password = process.env.PLATFORM_ADMIN_SEED_PASSWORD;

  if (!password) {
    console.error('❌ PLATFORM_ADMIN_SEED_PASSWORD is not set in environment');
    await dataSource.destroy();
    process.exit(1);
  }

  const existing = await manager.findOne(PlatformAdmin, { where: { email } });
  if (existing) {
    console.log(`✓ Platform admin already seeded — skipping (${email})`);
    await dataSource.destroy();
    return;
  }

  const admin = await manager.save(
    manager.create(PlatformAdmin, {
      email,
      name: 'Platform Super Admin',
      passwordHash: await bcrypt.hash(password, 12),
      platformRole: PlatformRole.SuperAdmin,
      status: PlatformAdminStatus.Active,
    }),
  );

  console.log(`✓ Platform SUPER_ADMIN created: ${admin.email}`);
  console.log(`  ID:   ${admin.id}`);
  console.log(`  Role: ${admin.platformRole}`);

  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error('❌ Platform admin seeder failed:', error.message);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
