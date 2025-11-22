import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './User';
import { School, SchoolSchema } from './School';
import { Comment, CommentSchema } from './Comment';
import { EduStop, EduStopSchema } from './EduStop';
import { MultipleChoiceQuestionSchema, OpenQuestionSchema, Question, QuestionSchema, Task, TaskSchema, TrueFalseQuestionSchema } from './Task';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), 
        MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }]),
        MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
        MongooseModule.forFeature([{ name: EduStop.name, schema: EduStopSchema }]),
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
    ],
    exports: [MongooseModule]
})
export class DatabaseModule {}
