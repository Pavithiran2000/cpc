import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlatformActivityLog, Tenant } from '../../../database/entities';

@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(PlatformActivityLog) private readonly activityLogs: Repository<PlatformActivityLog>,
  ) {}

  async getStats() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, active, inactive, suspended, portalUsers, newThisMonth, newLastMonth, activeSessions, failedLogins] =
      await Promise.all([
        this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM tenants'),
        this.dataSource.query<[{ count: string }]>("SELECT COUNT(*) as count FROM tenants WHERE status = 'ACTIVE'"),
        this.dataSource.query<[{ count: string }]>("SELECT COUNT(*) as count FROM tenants WHERE status = 'INACTIVE'"),
        this.dataSource.query<[{ count: string }]>("SELECT COUNT(*) as count FROM tenants WHERE status = 'SUSPENDED'"),
        this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM portal_users'),
        this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM tenants WHERE created_at >= $1', [firstOfMonth]),
        this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM tenants WHERE created_at >= $1 AND created_at < $2', [firstOfLastMonth, firstOfMonth]),
        this.dataSource.query<[{ count: string }]>("SELECT COUNT(*) as count FROM shift_sessions WHERE status = 'OPEN'"),
        this.dataSource.query<[{ count: string }]>("SELECT COUNT(*) as count FROM platform_activity_logs WHERE action = 'LOGIN_FAILED' AND created_at >= $1", [ago24h]),
      ]);

    const thisMonth = Number(newThisMonth[0]?.count ?? 0);
    const lastMonth = Number(newLastMonth[0]?.count ?? 0);
    const changePct = lastMonth === 0 ? null : ((thisMonth - lastMonth) / lastMonth) * 100;

    return {
      total_tenants: Number(total[0]?.count ?? 0),
      active_tenants: Number(active[0]?.count ?? 0),
      inactive_tenants: Number(inactive[0]?.count ?? 0),
      suspended_tenants: Number(suspended[0]?.count ?? 0),
      total_portal_users: Number(portalUsers[0]?.count ?? 0),
      new_tenants_this_month: thisMonth,
      new_tenants_last_month: lastMonth,
      new_tenants_change_pct: changePct !== null ? Math.round(changePct * 10) / 10 : null,
      active_sessions: Number(activeSessions[0]?.count ?? 0),
      failed_logins_24h: Number(failedLogins[0]?.count ?? 0),
    };
  }

  async getTenantGrowth() {
    const rows = await this.dataSource.query<Array<{ month: string; count: string }>>(
      `SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS month,
              date_trunc('month', created_at) AS month_ts,
              COUNT(*) as count
       FROM tenants
       WHERE created_at >= now() - interval '12 months'
       GROUP BY date_trunc('month', created_at)
       ORDER BY month_ts ASC`,
    );

    let cumulative = 0;
    return rows.map((r) => {
      cumulative += Number(r.count);
      return { month: r.month, new_tenants: Number(r.count), cumulative };
    });
  }

  async getStatusDistribution() {
    const rows = await this.dataSource.query<Array<{ status: string; count: string }>>(
      'SELECT status, COUNT(*) as count FROM tenants GROUP BY status ORDER BY status',
    );
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  async getRecentActivity(limit = 10) {
    return this.activityLogs
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC')
      .take(Math.min(limit, 50))
      .getMany();
  }

  async getRecentTenants(limit = 5) {
    return this.tenants
      .createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC')
      .take(Math.min(limit, 20))
      .getMany();
  }
}
