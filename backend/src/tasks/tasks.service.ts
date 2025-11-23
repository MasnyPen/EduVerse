import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import { EduStop } from 'src/database/EduStop';
import { Task, Question } from 'src/database/Task';
import { v4 as uuidv4 } from 'uuid';
import { User } from 'src/database/User';

@Injectable()
export class TasksService {

  private TASK_LIMIT = 5;
  private INTERVAL_MINUTES = 20;

  constructor(
    @InjectModel(EduStop.name) private eduStopModel: Model<EduStop>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}


  async requestTask(eduStopId: string) {
    const eduStop = await this.eduStopModel.findById(eduStopId);
    if (!eduStop) throw new BadRequestException('EduStop does not exist');

    const canSend = await this.canSendTask(eduStopId);
    if (!canSend) {
      throw new BadRequestException(
        `Limit ${this.TASK_LIMIT} zadań w ${this.INTERVAL_MINUTES} minut został osiągnięty`,
      );
    }

    const task = await this.pickTask();
    if (!task) {
      throw new BadRequestException('Brak dostępnych zadań');
    }

    await this.increaseRequestCounter(eduStopId);


    const accessToken = uuidv4();
    const redisKey = `task-token:${accessToken}`;
    await this.cacheManager.set(
      redisKey,
      {
        eduStopId,
        taskId: task.id,
        createdAt: new Date(),
        questions: task.questions,
      },
      {
        ttl: this.INTERVAL_MINUTES * 60,
      } as any,
    );

    return {
      taskId: task.id,
      content: {
        subject: task.subject,
        title: task.title,
        description: task.description,
        questions: task.questions,
      },
      accessToken,
      tokenTTLMinutes: this.INTERVAL_MINUTES,
    };
  }


  async verifyTaskResult(accessToken: string, userAnswers: { questionId: string; answers: string[] }[], userId: string) {
    const redisKey = `task-token:${accessToken}`;
    const tokenData = await this.cacheManager.get(redisKey) as any;

    if (!tokenData) {
      throw new BadRequestException('Invalid or expired token');
    }

    const { eduStopId, taskId, questions } = tokenData;

    let allCorrect = true;

    for (const question of questions as Question[]) {

      const questionId = (question as any)._id.toString();
      const userAnswer = userAnswers.find(u => u.questionId === questionId);

      if (!userAnswer) {
        allCorrect = false;
        break;
      }

      if (!this.checkAnswers(question.answers, userAnswer.answers)) {
        allCorrect = false;
        break;
      }
    }


    await this.cacheManager.del(redisKey);

    if (allCorrect) {
      await this.rewardUser(userId); 
    }

    return {
      verified: allCorrect,
      eduStopId,
      taskId,
    };
  }

  private checkAnswers(correct: string[], user: string[]): boolean {
    if (correct.length !== user.length) return false;
    const sortedCorrect = [...correct].sort();
    const sortedUser = [...user].sort();
    return sortedCorrect.every((v, i) => v === sortedUser[i]);
  }

  private async rewardUser(userId: string) {
    await this.userModel.updateOne({ _id: userId}, {
          $inc: { ranking: 2 }
        })
  }


  private async canSendTask(eduStopId: string): Promise<boolean> {
    const redisKey = `edustop:${eduStopId}:task_counter`;
    const current = (await this.cacheManager.get<number>(redisKey)) ?? 0;
    return current < this.TASK_LIMIT;
  }

  private async increaseRequestCounter(eduStopId: string) {
    const redisKey = `edustop:${eduStopId}:task_counter`;
    let current = (await this.cacheManager.get<number>(redisKey)) ?? 0;
    current++;
    await this.cacheManager.set(
      redisKey,
      current,
      this.INTERVAL_MINUTES * 60,
    );
  }

  private async pickTask(): Promise<Task | null> {
    const count = await this.taskModel.countDocuments();
    if (count === 0) return null;

    const randomOffset = Math.floor(Math.random() * count);
    return this.taskModel.findOne().skip(randomOffset);
  }
}
