import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LogInDto } from './dto/logIn.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('LogIn')
  @HttpCode(HttpStatus.OK)
  async logIn(@Body() logInDto: LogInDto) {
    return await this.authService.logIn(logInDto);
  }

  @Post('logOut')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: { user: { id: string; email: string } }) {
    return this.authService.logOut(req.user.id);
  }
}
