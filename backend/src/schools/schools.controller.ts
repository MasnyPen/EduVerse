import { Controller, Get, HttpCode, HttpStatus, Query, Request } from '@nestjs/common';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {

    constructor(private schoolsService: SchoolsService) {}

    @Get('/search')
    @HttpCode(HttpStatus.OK)
    async searchSchoolsByRadius(@Request() req, @Query('r') radius = 3) {
        return this.schoolsService.searchSchoolsByRadius(req, radius)
    }
}
