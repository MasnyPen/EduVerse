import { Controller, Delete, Get, Param, Post, Put, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { EdustopsService } from './edustops.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { HttpCode } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Query } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Controller('edustops')
export class EdustopsController {

    constructor(private edustopsService: EdustopsService) {}

    @UseInterceptors(CacheInterceptor)
    @UseGuards(JwtAuthGuard)
    @Post('search')
    @HttpCode(HttpStatus.OK)
    async searchSchoolsByRadius(@Request() req, @Query('r') radius = 3) {
        return this.edustopsService.searchEduStopByRadius(req.body, +radius)
    }

    @Get('/:id')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(CacheInterceptor)
    async getEduStop(@Param('id') id) {
        return await this.edustopsService.getEduStopFromId(id)
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createEduStop(@Request() req) {
        return await this.edustopsService.createEduStop(req.body)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateEduStop(@Request() req, @Param('id') id) {
        return await this.edustopsService.updateEduStop(req.body, id)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteEduStop(@Param('id') id) {
        return await this.edustopsService.deleteEduStop(id)
    }



}
