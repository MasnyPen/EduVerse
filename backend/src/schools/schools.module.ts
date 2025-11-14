import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { MongooseModule } from '@nestjs/mongoose';
import { School, SchoolSchema } from 'src/database/School';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]), CommentsModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, JwtAuthGuard]
})
export class SchoolsModule {}
