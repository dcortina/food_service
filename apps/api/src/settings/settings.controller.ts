import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@RequirePermissions('configuracion.gestionar')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('business')
  getBusiness(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getBusiness(user);
  }

  @Patch('business')
  updateBusiness(
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateBusiness(dto, user);
  }
}
