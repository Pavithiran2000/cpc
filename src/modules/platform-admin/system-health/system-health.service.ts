import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlatformAdminRefreshToken, Tenant } from '../../../database/entities';

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PlatformAdminRefreshToken) private readonly tokens: Repository<PlatformAdminRefreshToken>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async getHealth() {
    const dbStatus = await this.checkDatabase();
    const memory = this.getMemory();
    const uptime = Math.floor(process.uptime());

    const [activeSessions, totalTenants, requestsToday] = await Promise.all([
      this.dataSource
        .query<[{ count: string }]>(
          'SELECT COUNT(*) as count FROM platform_admin_refresh_tokens WHERE revoked_at IS NULL AND expires_at > now()',
        )
        .then((r) => Number(r[0]?.count ?? 0))
        .catch(() => 0),
      this.tenants.count().catch(() => 0),
      this.dataSource
        .query<[{ count: string }]>(
          "SELECT COUNT(*) as count FROM platform_activity_logs WHERE created_at >= date_trunc('day', now())",
        )
        .then((r) => Number(r[0]?.count ?? 0))
        .catch(() => 0),
    ]);

    return {
      status: dbStatus.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      services: {
        database: dbStatus,
        memory,
      },
      metrics: {
        uptime_seconds: uptime,
        active_platform_sessions: activeSessions,
        total_tenants: totalTenants,
        api_requests_today: requestsToday,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: string; latency_ms: number }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const latency = Date.now() - start;
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'slow',
        latency_ms: latency,
      };
    } catch {
      return { status: 'down', latency_ms: -1 };
    }
  }

  private getMemory() {
    const mem = process.memoryUsage();
    return {
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      rss_mb: Math.round(mem.rss / 1024 / 1024),
    };
  }
}
