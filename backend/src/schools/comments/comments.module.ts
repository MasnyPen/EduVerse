import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from 'src/database/Comment';
import { UsersModule } from 'src/users/users.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [CommentsService],
  controllers: [CommentsController]
})
export class CommentsModule {}
