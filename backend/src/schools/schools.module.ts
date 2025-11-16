import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { MongooseModule } from '@nestjs/mongoose';
import { School, SchoolSchema } from 'src/database/School';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';
import { CommentsModule } from './comments/comments.module';
import { User, UserSchema } from 'src/database/User';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]), MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), CommentsModule, UsersModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, JwtAuthGuard],
  exports: [MongooseModule]
})
export class SchoolsModule {}
