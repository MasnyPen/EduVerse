import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class EduStop extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true})
  latitude: number;
  @Prop({ required: true})
  longitude: number;
}

export const EduStopSchema = SchemaFactory.createForClass(EduStop);
