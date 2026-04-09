import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
    UseGuards
} from '@nestjs/common';
import {Request} from 'express';
import {ChatService} from './chat.service';
import {JwtGuard} from '../_guards/jwt.guard';
import {parseError} from "../_helpers/parseError";

@Controller()
@UseGuards(JwtGuard)
export class ChatController {
    constructor(private chat: ChatService) {
    }

    @Get('users')
    async getUsers(@Query('search') search?: string) {
        try {
            return await this.chat.getUsers(search || undefined);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Get('conversations')
    async getConversations(@Req() req: Request & { userId: string }) {
        try {
            return await this.chat.getConversations(req.userId);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Post('conversations')
    async createConversation(@Req() req: Request & { userId: string }, @Body() body: { userId: string }) {
        try {
            return await this.chat.createConversation(req.userId, body.userId);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Delete('conversations/:id')
    async deleteConversation(
        @Req() req: Request & { userId: string },
        @Param('id') id: string,
    ) {
        try {
            return await this.chat.deleteConversation(req.userId, id);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Get('conversations/:id')
    async getConversation(
        @Req() req: Request & { userId: string },
        @Param('id') id: string,
    ) {
        try {
            return await this.chat.getConversation(req.userId, id);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Get('conversations/:id/messages')
    async getMessages(
        @Req() req: Request & { userId: string },
        @Param('id') id: string,
        @Query('limit') limit?: string,
        @Query('before') before?: string,
    ) {
        try {
            return await this.chat.getMessages(req.userId, id, limit ? parseInt(limit, 10) : 50, before);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Post('conversations/:id/messages')
    async sendMessage(
        @Req() req: Request & { userId: string },
        @Param('id') id: string,
        @Body() body: { text: string },
    ) {
        try {
            return await this.chat.sendMessage(req.userId, id, body.text);
        } catch (e: unknown) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }
}
