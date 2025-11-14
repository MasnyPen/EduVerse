import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User'})
  userId: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId, ref: 'School'})
  schoolId: Types.ObjectId
  @Prop({ required: true })
  content: String
  @Prop({ required: true })
  stars: number
  @Prop({ required: false, type: [Types.ObjectId], ref: 'User', default: []})
  likes: Types.ObjectId[]
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
