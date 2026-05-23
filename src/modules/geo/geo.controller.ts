import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { GeoService } from './geo.service';

@Controller('geo')
@Public()
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('provinces')
  provinces() {
    return this.geo.listProvinces();
  }

  @Get('districts')
  districts(@Query('province_id') provinceId?: number) {
    return this.geo.listDistricts(provinceId);
  }

  @Get('cities')
  cities(@Query('search') search?: string, @Query('district_id') districtId?: number) {
    return this.geo.searchCities(search, districtId);
  }
}
