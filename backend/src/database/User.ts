import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: [Types.ObjectId], ref: 'School', default: []})
  schoolsHistory: Types.ObjectId[]

}

export const UserSchema = SchemaFactory.createForClass(User);

export interface UserDetails {
  userId: string,
  username: string,
  likes?: string[],
  schoolsHistory?: string[]
}