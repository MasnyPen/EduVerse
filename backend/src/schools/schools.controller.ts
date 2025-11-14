import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Controller('schools')
export class SchoolsController {

    constructor(private schoolsService: SchoolsService) {}

    @Get('search')
    @HttpCode(HttpStatus.OK)
    async searchSchoolsByRadius(@Request() req, @Query('r') radius = 3) {
        return this.schoolsService.searchSchoolsByRadius(req, +radius)
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getSchool(@Param('id') id) {
        return this.schoolsService.getSchool(id)
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/likes')
    @HttpCode(HttpStatus.OK)
    async addLikeToSchool(@Param('id') schoolId, @Request() req) {
        return this.schoolsService.addLikesToSchool(schoolId, req.user._id)
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/likes')
    @HttpCode(HttpStatus.OK)
    async removeLikeFromSchool(@Param('id') schoolId, @Request() req) {
        return this.schoolsService.removeLikesFromSchool(schoolId, req.user._id)
    }
}
