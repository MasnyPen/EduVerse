import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Model } from 'mongoose';
import { Comment } from 'src/database/Comment';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Controller('schools/:schoolId/comments')
export class CommentsController {

    constructor(private commentsService: CommentsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getComments(@Param('schoolId') schoolId: string, @Query('page') page = 0, @Query('size') size = 15) {
        return await this.commentsService.getComments(schoolId, page, size)
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async createComment(@Request() req, @Param('schoolId') schoolId: string) {
        return await this.commentsService.createComment(req.body, schoolId, req.user)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async updateComment(@Request() req, @Param('id') id: string) {
        return await this.commentsService.updateComment(req.body, id, req.user.sub)
    }

    @Delete (':id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async deleteComment( @Param('id') id: string) {
        return await this.commentsService.deleteComment(id)
    }


}
