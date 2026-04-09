import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {diskStorage} from 'multer';
import {join, resolve} from 'path';
import {existsSync, mkdirSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import {StoryService} from './story.service';
import {JwtGuard} from '../_guards/jwt.guard';
import {parseError} from "../_helpers/parseError";

const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'stories');
mkdirSync(UPLOAD_DIR, {recursive: true});

@Controller('stories')
@UseGuards(JwtGuard)
export class StoryController {
    constructor(private storyService: StoryService) {
    }

    @Post()
    @UseInterceptors(FileInterceptor('video', {
        storage: diskStorage({
            destination: UPLOAD_DIR,
            filename: (_req, _file, cb) => cb(null, `${uuidv4()}.webm`),
        }),
        limits: {fileSize: 100 * 1024 * 1024},
    }))
    async create(
        @Req() req: Request & { userId: string },
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new HttpException({errorCode: 'NO_FILE'}, HttpStatus.BAD_REQUEST);
        try {
            return await this.storyService.createStory(req.userId, file.path);
        } catch (e) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async list() {
        try {
            return {stories: await this.storyService.getActiveStories()};
        } catch (e) {
            throw new HttpException(parseError(e), HttpStatus.BAD_REQUEST);
        }
    }

    @Get(':id/video')
    async video(@Param('id') id: string, @Res() res: any) {
        try {
            const videoPath = await this.storyService.getVideoPath(id);
            if (!videoPath) throw new HttpException({errorCode: 'NOT_FOUND'}, HttpStatus.NOT_FOUND);
            const absPath = resolve(videoPath);
            if (!existsSync(absPath)) throw new HttpException({errorCode: 'FILE_NOT_FOUND'}, HttpStatus.NOT_FOUND);
            res.sendFile(absPath);
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new HttpException(parseError(e), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
