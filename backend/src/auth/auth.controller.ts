import { Controller, Post, UseGuards, Request, Get, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { LocalAuthGuard } from 'src/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-guard.guard';

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body) {
    const success = await this.authService.register(body);
    if (!success) {
      return { message: 'Użytkownik już istnieje' };
    }
    return { message: 'Rejestracja zakończona sukcesem' };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.ACCEPTED)
  async login(@Request() req) {
    return this.authService.login(req.user)
  }
}
