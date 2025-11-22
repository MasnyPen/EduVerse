import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('edustop')
export class TasksController {
  constructor(private readonly taskService: TasksService) {}

  @Get(':id/request')
  async requestTask(
    @Param('id') id: string,) {
    return this.taskService.requestTask(id);
  }

  @Post('verify')
  async verify(
    @Query('accessToken') accessToken: string,
    @Body() result: any,
    @Request() req
  ) {
    return this.taskService.verifyTaskResult(accessToken, result, req.user.userId);
  }
}
