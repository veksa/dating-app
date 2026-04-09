import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import {Request} from 'express';
import {JwtService} from '../jwt/jwt.service';

@Injectable()
export class JwtGuard implements CanActivate {
    constructor(private jwt: JwtService) {
    }

    public canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request & { userId: string }>();
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing token');
        }

        const token = auth.slice(7);
        const payload = this.jwt.tryVerify(token);
        if (!payload) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        req.userId = payload.userId;

        return true;
    }
}
