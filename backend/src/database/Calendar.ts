import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Calendar extends Document {
  @Prop({required: true})
  year: number
  @Prop({ required: true})
  dates: {
    dates: string[],
    title: string,
    perms: string[]
  }[]
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar);
