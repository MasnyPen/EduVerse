import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/* ============================
   ENUM
============================ */
export enum TaskSubject {
  MATH = 'MATH',
  ENGLISH = 'ENGLISH',
  POLISH = 'POLISH',
}

/* ============================
   OPTION
============================ */
@Schema()
export class Option {
  @Prop()
  key: string;

  @Prop()
  text: string;
}

export const OptionSchema = SchemaFactory.createForClass(Option);

/* ============================
   SOURCE
============================ */
@Schema()
export class Source {
  @Prop()
  url: string;

  @Prop()
  name: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);

/* ============================
   BASE QUESTION (with discriminator)
============================ */
@Schema({ discriminatorKey: 'type' })
export class Question {
  @Prop()
  questionId: string;

  @Prop()
  content: string;

  @Prop([String])
  answers: string[];
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/* ============================
   TRUE / FALSE QUESTION
============================ */
export class TrueFalseQuestion extends Question {
  options: Option[];
}

export const TrueFalseQuestionSchema =
  SchemaFactory.createForClass(TrueFalseQuestion);

/* ============================
   MULTIPLE CHOICE QUESTION
============================ */
export class MultipleChoiceQuestion extends Question {
  options: Option[];
}

export const MultipleChoiceQuestionSchema =
  SchemaFactory.createForClass(MultipleChoiceQuestion);

/* ============================
   OPEN QUESTION
============================ */
export class OpenQuestion extends Question {}

export const OpenQuestionSchema =
  SchemaFactory.createForClass(OpenQuestion);

/* ============================
   TASK
============================ */
@Schema({ collection: 'tasks' })
export class Task extends Document {
  @Prop({ enum: TaskSubject })
  subject: TaskSubject;

  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop({ type: [QuestionSchema] })
  questions: Question[];

  @Prop({ type: [SourceSchema] })
  sources: Source[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);
