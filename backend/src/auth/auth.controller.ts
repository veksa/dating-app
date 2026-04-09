import {Body, Controller, HttpCode, HttpException, HttpStatus, Post} from '@nestjs/common';
import {AuthService} from './auth.service';
import {parseError} from "../_helpers/parseError";

@Controller('auth')
export class AuthController {
    constructor(private auth: AuthService) {
    }

    @Post('register')
    async register(@Body() body: { email: string; password: string; username: string }) {
        try {
            return await this.auth.register(body.email, body.password, body.username);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Post('login')
    @HttpCode(200)
    async login(@Body() body: { email: string; password: string }) {
        try {
            return await this.auth.login(body.email, body.password);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('refresh')
    @HttpCode(200)
    async refresh(@Body() body: { refreshToken: string }) {
        try {
            return await this.auth.refresh(body.refreshToken);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('logout')
    @HttpCode(200)
    async logout(@Body() body: { refreshToken: string }) {
        await this.auth.logout(body.refreshToken);
        return {};
    }
}
