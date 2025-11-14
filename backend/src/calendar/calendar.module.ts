import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Calendar, CalendarSchema } from 'src/database/Calendar';

@Module({
  imports: [MongooseModule.forFeature([{ name: Calendar.name, schema: CalendarSchema }])],
  providers: [CalendarService],
  controllers: [CalendarController]
})
export class CalendarModule {}
