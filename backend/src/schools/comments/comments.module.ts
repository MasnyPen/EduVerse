import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentSchema } from 'src/database/Comment';
import { School } from 'src/database/School';

@Module({
  imports: [MongooseModule.forFeature([{ name: School.name, schema: CommentSchema }])],
  providers: [CommentsService],
  controllers: [CommentsController]
})
export class CommentsModule {}
