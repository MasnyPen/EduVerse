import { Controller, Get, HttpCode, HttpStatus, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { CalendarService } from './calendar.service';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('calendar')
@UseInterceptors(CacheInterceptor)
@CacheTTL(108000)
export class CalendarController {

    constructor(private calendarService: CalendarService) {}

    @Get('today')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getTodayDate() {
        return await this.calendarService.getTodayDate()
    }

    @Get(':year')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    async getCalendarByYear(@Param('year') year: string) {
        return await this.calendarService.getCalendarByYear(+year)
    }


}
