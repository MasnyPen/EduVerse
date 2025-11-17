import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { SchoolUnlockedGuard } from 'src/guards/school-unlocked.guard';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('schools/:schoolId/comments')

export class CommentsController {

    constructor(private commentsService: CommentsService) {}

    @UseInterceptors(CacheInterceptor)
    @Get()
    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @HttpCode(HttpStatus.OK)
    async getComments(@Request() req, @Param('schoolId') schoolId: string, @Query('page') page = 0, @Query('size') size = 15) {
        return await this.commentsService.getComments(schoolId, page, size, req.user.userId)
    }

    @Post()
    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @HttpCode(HttpStatus.OK)
    async createComment(@Request() req, @Param('schoolId') schoolId: string) {
        return await this.commentsService.createComment(req.body, schoolId, req.user.userId)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @HttpCode(HttpStatus.OK)
    async updateComment(@Request() req, @Param('id') id: string) {
        return await this.commentsService.updateComment(req.body, id, req.user.userId)
    }

    @Delete (':id')
    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @HttpCode(HttpStatus.OK)
    async deleteComment(@Param('id') id: string, @Request() req) {
        return await this.commentsService.deleteComment(id, req)
    }

    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @Post(':id/likes')
    @HttpCode(HttpStatus.OK)
    async addLikeToComment(@Param('id') comId, @Request() req) {
        return this.commentsService.addLikeToComment(comId, req.user.userId)
    }

    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @Delete(':id/likes')
    @HttpCode(HttpStatus.OK)
    async removeLikeToComment(@Param('id') comId, @Request() req) {
        return this.commentsService.removeLikeToComment(comId, req.user.userId)
    }
}
