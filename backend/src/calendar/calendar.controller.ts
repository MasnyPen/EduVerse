import { Controller, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { CalendarService } from './calendar.service';

@Controller('calendar')
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
