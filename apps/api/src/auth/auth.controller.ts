import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { PinVerifyDto } from './dto/pin-verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { getRequestMeta } from './request-meta';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, getRequestMeta(request));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() request: Request) {
    return this.authService.refresh(dto, getRequestMeta(request));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: LogoutDto, @Req() request: Request) {
    return this.authService.logout(dto, getRequestMeta(request));
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('pin/verify')
  verifyPin(
    @Body() dto: PinVerifyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.authService.verifyPin(dto, user, getRequestMeta(request));
  }
}
