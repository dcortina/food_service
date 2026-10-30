import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AuditModule } from '../common/audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

function parseTtlToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 900;

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers = {
    s: 1,
    m: 60,
    h: 3_600,
    d: 86_400,
  } as const;

  return amount * multipliers[unit];
}

@Module({
  imports: [
    PassportModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const privateKeyPath = config.get<string>('JWT_PRIVATE_KEY_PATH');
        const publicKeyPath = config.get<string>('JWT_PUBLIC_KEY_PATH');

        if (!privateKeyPath || !publicKeyPath) {
          throw new Error(
            'JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH are required',
          );
        }

        const accessTtl = config.get<string>('JWT_ACCESS_TTL') ?? '15m';

        return {
          privateKey: readFileSync(resolve(privateKeyPath), 'utf8'),
          publicKey: readFileSync(resolve(publicKeyPath), 'utf8'),
          signOptions: {
            algorithm: 'RS256',
            expiresIn: parseTtlToSeconds(accessTtl),
            issuer: config.get<string>('JWT_ISSUER') ?? 'cafeqr',
            audience: config.get<string>('JWT_AUDIENCE') ?? 'cafeqr-api',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
