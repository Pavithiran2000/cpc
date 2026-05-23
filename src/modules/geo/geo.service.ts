import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { GeoCity, GeoCustomCity, GeoDistrict, GeoProvince } from '../../database/entities';

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(GeoProvince) private readonly provinces: Repository<GeoProvince>,
    @InjectRepository(GeoDistrict) private readonly districts: Repository<GeoDistrict>,
    @InjectRepository(GeoCity) private readonly cities: Repository<GeoCity>,
    @InjectRepository(GeoCustomCity) private readonly customCities: Repository<GeoCustomCity>,
  ) {}

  listProvinces() {
    return this.provinces.find({ order: { name: 'ASC' } });
  }

  listDistricts(provinceId?: number) {
    return this.districts.find({
      where: provinceId ? { provinceId } : {},
      order: { name: 'ASC' },
    });
  }

  async searchCities(search = '', districtId?: number) {
    const normalizedSearch = search.trim();
    const seeded = this.cities
      .createQueryBuilder('city')
      .innerJoinAndSelect('city.district', 'district')
      .innerJoinAndSelect('city.province', 'province')
      .orderBy('city.name', 'ASC')
      .limit(25);

    if (districtId) {
      seeded.andWhere('city.districtId = :districtId', { districtId });
    }
    if (normalizedSearch) {
      seeded.andWhere(
        new Brackets((qb) => {
          qb.where('city.name ILIKE :search', { search: `%${normalizedSearch}%` }).orWhere(
            'city.subName ILIKE :search',
            { search: `%${normalizedSearch}%` },
          );
        }),
      );
    }

    const officialRows = await seeded.getMany();

    const custom = this.customCities
      .createQueryBuilder('city')
      .innerJoinAndSelect('city.district', 'district')
      .innerJoinAndSelect('city.province', 'province')
      .where('city.status = :status', { status: 'APPROVED' })
      .orderBy('city.name', 'ASC')
      .limit(25);

    if (districtId) {
      custom.andWhere('city.districtId = :districtId', { districtId });
    }
    if (normalizedSearch) {
      custom.andWhere('city.name ILIKE :search', { search: `%${normalizedSearch}%` });
    }

    const customRows = await custom.getMany();

    return [
      ...officialRows.map((city) => ({
        id: city.id,
        source: 'OFFICIAL' as const,
        name: city.name,
        sub_name: city.subName,
        postal_code: city.postalCode,
        latitude: city.latitude,
        longitude: city.longitude,
        district: city.district && { id: city.district.id, name: city.district.name },
        province: city.province && { id: city.province.id, name: city.province.name },
      })),
      ...customRows.map((city) => ({
        id: city.id,
        source: 'CUSTOM' as const,
        name: city.name,
        postal_code: city.postalCode,
        latitude: city.latitude,
        longitude: city.longitude,
        district: city.district && { id: city.district.id, name: city.district.name },
        province: city.province && { id: city.province.id, name: city.province.name },
      })),
    ].slice(0, 25);
  }
}
