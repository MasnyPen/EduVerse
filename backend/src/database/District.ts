import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class District extends Document {
  @Prop({ required: true})
  name: String;
  @Prop({ required: false})
  voivodeship: String;
  @Prop({ required: false})
  capital: String;
  @Prop({ required: false})
  banner: String;
  @Prop({ required: false})
  emblem: String[]
  @Prop({ required: false})
  beta: Boolean
  @Prop({ required: false})
  used: Number
}

export const DistrictSchema = SchemaFactory.createForClass(District);
