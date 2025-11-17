import { Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-guard.guard';

@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req) {
        return await this.usersService.getUser(req.user)
    }

    @Post('unlockschool')
    @UseGuards(JwtAuthGuard)
    async unlockSchool(@Request() req) {
        return await this.usersService.unlockSchool(req.body, req.user)
    }

    @Get('ranking')
    @UseGuards(JwtAuthGuard)
    async getRanking(@Query('page') page = 0, @Query('size') size = 15) {
      return await this.usersService.getRanking(page, size)
    }
}
