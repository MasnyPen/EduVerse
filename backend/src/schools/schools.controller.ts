import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { SchoolUnlockedGuard } from 'src/guards/school-unlocked.guard';

@Controller('schools')
export class SchoolsController {

    constructor(private schoolsService: SchoolsService) {}

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async searchSchoolsByRadius(@Request() req, @Query('r') radius = 3) {
        return this.schoolsService.searchSchoolsByRadius(req, +radius)
    }

    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @Get(':schoolId')
    @HttpCode(HttpStatus.OK)
    async getSchool(@Request() req, @Param('schoolId') id) {
        return this.schoolsService.getSchool(id, req.user.userId)
    }

    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @Post(':schoolId/likes')
    @HttpCode(HttpStatus.OK)
    async addLikeToSchool(@Param('schoolId') schoolId, @Request() req) {
        return this.schoolsService.addLikeToSchool(schoolId, req.user.userId)
    }

    @UseGuards(JwtAuthGuard, SchoolUnlockedGuard)
    @Delete(':schoolId/likes')
    @HttpCode(HttpStatus.OK)
    async removeLikeFromSchool(@Param('schoolId') schoolId, @Request() req) {
        return this.schoolsService.removeLikeFromSchool(schoolId, req.user.userId)
    }
}
