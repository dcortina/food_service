import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CatalogService } from './catalog.service';

@ApiTags('public')
@Public()
@Controller('public/menu')
export class PublicMenuController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get(':codigoQr')
  getMenu(@Param('codigoQr') codigoQr: string) {
    return this.catalogService.getPublicMenu(codigoQr);
  }
}
