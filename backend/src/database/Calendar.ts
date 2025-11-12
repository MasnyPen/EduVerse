import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Calendar extends Document {
  @Prop({ required: true})
  dates: {
    dates: String[],
    title: String,
    perms: String[]
  }
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar);
