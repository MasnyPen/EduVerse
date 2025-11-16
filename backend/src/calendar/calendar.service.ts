import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Calendar } from 'src/database/Calendar';

@Injectable()
export class CalendarService {

    constructor(@InjectModel(Calendar.name) private calendarModel: Model<Calendar>) {}

    async getTodayDate(): Promise<string> {
        const date = new Date()
        let year = date.getFullYear() 

        if (date.getMonth() <= 8 ) {
            year--
        }
        
        const calendar = await this.calendarModel.findOne({year: year}).lean<Calendar>().exec()


        const today = `${year}-${date.getMonth()}-${date.getDate()}`
        
        if (calendar === null) return ""

        const todayDate = calendar.dates.find((el) => el.dates.includes(today))

        return todayDate?.title || "Brak zaplanowanych wydarzeń na dziś."
    }

    async getCalendarByYear(year: number): Promise<Calendar | null> {
        const calendar = await this.calendarModel.findOne({year: Number(year)})
        
        if (calendar == null) {
            throw new NotFoundException("Podany rok nie istnieje.")
        }

        return calendar
    }
}
