import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Controller('tasks')
export class TasksController {
  constructor(private readonly taskService: TasksService) {}

  @Get(':id/request')
  @UseGuards(JwtAuthGuard)
  async requestTask(
    @Param('id') id: string,) {
    return this.taskService.requestTask(id);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(
    @Query('accessToken') accessToken: string,
    @Request() req
  ) {
    return this.taskService.verifyTaskResult(accessToken, req.body, req.user.userId);
  }
}
