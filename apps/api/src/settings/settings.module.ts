import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, BrandingController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
