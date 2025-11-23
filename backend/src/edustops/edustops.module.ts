import { Module } from '@nestjs/common';
import { EdustopsService } from './edustops.service';
import { EdustopsController } from './edustops.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Module({
  imports: [DatabaseModule],
  providers: [EdustopsService, JwtAuthGuard],
  controllers: [EdustopsController]
})
export class EdustopsModule {}
