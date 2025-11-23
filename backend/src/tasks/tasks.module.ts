import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DatabaseModule } from 'src/database/database.module';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Module({
  imports: [DatabaseModule],
  providers: [TasksService, JwtAuthGuard],
  controllers: [TasksController]
})
export class TasksModule {}
