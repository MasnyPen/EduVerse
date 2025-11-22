import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, JwtAuthGuard],
})
export class SchoolsModule {}
