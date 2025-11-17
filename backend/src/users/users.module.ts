import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/User';
import { UsersController } from './users.controller';
import { School, SchoolSchema } from 'src/database/School';
import { Comment, CommentSchema } from 'src/database/Comment';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), 
  MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
  MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }])
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
  controllers: [UsersController]
})
export class UsersModule {}
