import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { MultipleChoiceQuestionSchema, OpenQuestionSchema, Question, QuestionSchema, Task, TaskSchema, TrueFalseQuestionSchema } from 'src/database/Task';
import { EduStop, EduStopSchema } from 'src/database/EduStop';
import { User, UserSchema } from 'src/database/User';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Question.name,
        useFactory: () => {
          const schema = QuestionSchema;
          schema.discriminator('TRUE_FALSE', TrueFalseQuestionSchema);
          schema.discriminator('MULTIPLE_CHOICE', MultipleChoiceQuestionSchema);
          schema.discriminator('OPEN', OpenQuestionSchema);
          return schema;
        },
      },
      {
        name: Task.name,
        useFactory: () => TaskSchema,
      },
    ]),
    MongooseModule.forFeature([{ name: EduStop.name, schema: EduStopSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  providers: [TasksService],
  controllers: [TasksController]
})
export class TasksModule {}
