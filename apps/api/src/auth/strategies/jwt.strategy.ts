import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const publicKeyPath = config.get<string>('JWT_PUBLIC_KEY_PATH');
    if (!publicKeyPath) {
      throw new Error('JWT_PUBLIC_KEY_PATH is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readFileSync(resolve(publicKeyPath), 'utf8'),
      algorithms: ['RS256'],
      issuer: config.get<string>('JWT_ISSUER') ?? 'cafeqr',
      audience: config.get<string>('JWT_AUDIENCE') ?? 'cafeqr-api',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    return {
      id: payload.sub,
      negocioId: payload.negocioId,
      sucursalId: payload.sucursalId,
      rol: payload.rol,
      permisos: payload.permisos ?? [],
    };
  }
}
