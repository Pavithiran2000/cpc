import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
