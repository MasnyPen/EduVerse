import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/database/User';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findOne(username: string): Promise<User | null> {
    const user = await this.userModel.findOne({ username }).lean<User>().exec();
    return user || null;
  }



  async create(userData: { username: string; password: string }): Promise<boolean> {
    const userExists = await this.findOne(userData.username);
    if (userExists)
      throw new HttpException(
        { message: 'Użytkownik już istnieje' },
        HttpStatus.CONFLICT,
      );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    try {
      await this.userModel.create({
        username: userData.username,
        password: hashedPassword,
      });
      return true
    } catch (e) {
      console.error(e);
      throw new HttpException(
        { message: 'Wystąpił błąd w zapisywaniu' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
