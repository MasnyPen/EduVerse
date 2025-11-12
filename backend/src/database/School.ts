import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class School extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'District' })
  districtId: Types.ObjectId;

  @Prop({ required: false })
  url?: string;

  @Prop({ required: false })
  paid?: boolean;

  @Prop({ required: false })
  img?: string;

  @Prop({
    required: false,
    type: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  })
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  @Prop({
    required: false,
    type: {
      polish: { type: Number },
      math: { type: Number },
      aliens: { type: Number },
    },
  })
  results?: {
    polish?: number;
    math?: number;
    aliens?: number;
  };

  @Prop({
    required: false,
    type: [
      {
        name: { type: String },
        type: { type: Number },
        tags: { type: [String], default: [] },
        extensions: { type: [String], default: [] },
        extensionsOpt: { type: [String], default: [] },
        img: { type: String },
      },
    ],
  })
  profiles?: {
    name: string;
    type: number;
    tags: string[];
    extensions: string[];
    extensionsOpt: string[];
    img: string;
  }[];

  @Prop({ required: false, type: [Types.ObjectId], ref: 'User', default: [] })
  likes: Types.ObjectId[];
}

export const SchoolSchema = SchemaFactory.createForClass(School);
