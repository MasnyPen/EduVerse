import { Module } from '@nestjs/common';
import { EdustopsService } from './edustops.service';
import { EdustopsController } from './edustops.controller';
import { EduStop, EduStopSchema } from 'src/database/EduStop';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: EduStop.name, schema: EduStopSchema }])],
  providers: [EdustopsService],
  controllers: [EdustopsController]
})
export class EdustopsModule {}
