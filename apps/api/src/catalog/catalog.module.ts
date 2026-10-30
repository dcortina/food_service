import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicMenuController } from './public-menu.controller';

@Module({
  controllers: [CatalogController, PublicMenuController],
  providers: [CatalogService],
})
export class CatalogModule {}
