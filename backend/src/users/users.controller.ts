import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
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

    @Post('/user/unlockschool')
    @UseGuards(JwtAuthGuard)
    async unlockSchool(@Request() req) {
        return await this.usersService.unlockSchool(req.body, req.user)
    }
}
