import { Module } from '@nestjs/common';
import { EdustopsService } from './edustops.service';
import { EdustopsController } from './edustops.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [EdustopsService],
  controllers: [EdustopsController]
})
export class EdustopsModule {}
