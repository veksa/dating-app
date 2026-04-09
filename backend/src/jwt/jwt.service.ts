import {Injectable} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import {ConfigService} from '../config/config.service';

export interface IJwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtService {
    private readonly secret: string;
    private readonly accessExpiresIn: number;

    constructor(config: ConfigService) {
        const cfg = config.get();
        this.secret = cfg.auth.jwtSecret;
        this.accessExpiresIn = cfg.auth.jwtAccessExpiresIn;
    }

    sign(userId: string): string {
        return jwt.sign({userId}, this.secret, {expiresIn: this.accessExpiresIn});
    }

    verify(token: string): IJwtPayload {
        return jwt.verify(token, this.secret) as IJwtPayload;
    }

    tryVerify(token: string): IJwtPayload | null {
        try {
            return this.verify(token);
        } catch {
            return null;
        }
    }
}
