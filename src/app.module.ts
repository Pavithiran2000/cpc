import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RouterModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { platformAdminConfig } from './config/platform-admin.config';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { PlatformAuthModule } from './modules/platform-admin/auth/platform-auth.module';
import { PlatformTenantsModule } from './modules/platform-admin/tenants/platform-tenants.module';
import { PlatformAdminsModule } from './modules/platform-admin/admins/platform-admins.module';
import { PlatformDashboardModule } from './modules/platform-admin/dashboard/platform-dashboard.module';
import { PlatformActivityModule } from './modules/platform-admin/activity/platform-activity.module';
import { SystemHealthModule } from './modules/platform-admin/system-health/system-health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { EntityChangeLogInterceptor } from './common/interceptors/entity-change-log.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PortalUsersModule } from './modules/portal-users/portal-users.module';
import { OperationalRolesModule } from './modules/operational-roles/operational-roles.module';
import { StaffModule } from './modules/staff/staff.module';
import { ProductsModule } from './modules/products/products.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PumpsModule } from './modules/pumps/pumps.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BowserReceiptsModule } from './modules/bowser-receipts/bowser-receipts.module';
import { StockOrdersModule } from './modules/stock-orders/stock-orders.module';
import { CreditDuesModule } from './modules/credit-dues/credit-dues.module';
import { ChequesModule } from './modules/cheques/cheques.module';
import { DailyBalancingModule } from './modules/daily-balancing/daily-balancing.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { ShiftCorrectionsModule } from './modules/shift-corrections/shift-corrections.module';
import { GeoModule } from './modules/geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({ app: appConfig() }),
        () => ({ jwt: jwtConfig() }),
        () => ({ platformAdmin: platformAdminConfig() }),
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    RouterModule.register([
      {
        path: 'platform',
        module: PlatformAdminModule,
        children: [
          { path: 'auth', module: PlatformAuthModule },
          { path: 'tenants', module: PlatformTenantsModule },
          { path: 'admins', module: PlatformAdminsModule },
          { path: 'dashboard', module: PlatformDashboardModule },
          { path: 'activity-logs', module: PlatformActivityModule },
          { path: 'system-health', module: SystemHealthModule },
        ],
      },
    ]),
    JwtModule.register({}),
    AuditModule,
    GeoModule,
    AuthModule,
    TenantsModule,
    PortalUsersModule,
    OperationalRolesModule,
    StaffModule,
    ProductsModule,
    ShiftsModule,
    AttendanceModule,
    PumpsModule,
    InventoryModule,
    BowserReceiptsModule,
    StockOrdersModule,
    CreditDuesModule,
    ChequesModule,
    DailyBalancingModule,
    PayrollModule,
    ReportsModule,
    ShiftCorrectionsModule,
    PlatformAdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: EntityChangeLogInterceptor },
  ],
})
export class AppModule {}
