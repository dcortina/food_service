import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('public')
@Public()
@Controller('public')
export class BrandingController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('branding')
  getBranding() {
    return this.settingsService.getPublicBranding();
  }
}
