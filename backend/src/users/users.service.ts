import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDetails } from 'src/database/User';
import { School } from 'src/database/School';
import { Comment } from 'src/database/Comment';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>, @InjectModel(School.name) private schoolModel: Model<School>, @InjectModel(Comment.name) private commentModel: Model<Comment>) {}

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

  async getUser(user: { userId: string, username: string }): Promise<UserDetails> {
    const userLikes = await this.schoolModel.find(
      { likes: new Types.ObjectId(user.userId) },
      { _id: 1 }
    ).exec();

    const data = await this.userModel.findById(
      user.userId,
      { schoolsHistory: 1, ranking: 1 }
    ).exec();

    if (!data) throw new BadRequestException("Użytkownik nie istnieje");

    const rankingPosition = await this.userModel.countDocuments({
      ranking: { $gt: data.ranking }
    }) + 1;

    const userDetails: UserDetails = {
      ...user,
      likes: userLikes.map(el => String(el._id)),
      schoolsHistory: data.schoolsHistory.map(el => String(el)),
      ranking: data.ranking,
      rankingPosition: rankingPosition
    };

    return userDetails;
  }


  async unlockSchool(body: {latitude: number, longitude: number, schoolId: string }, user: { username: string, userId: string }) {
    const school = await this.schoolModel.findById(body.schoolId).exec();

    if (!school) throw new BadRequestException("Nie znaleziono szkoły");

    const latMeters = (body.latitude - school.coordinates!.latitude) * 111_000;
    const lonMeters = (body.longitude - school.coordinates!.longitude) * 111_000 * Math.cos(school.coordinates!.latitude * Math.PI / 180);

    const distance = Math.sqrt(latMeters ** 2 + lonMeters ** 2);

    const MAX_DISTANCE = 100;

    if (distance > MAX_DISTANCE) {
      throw new HttpException(
        { message: 'Za daleko od szkoły, nie można odblokować.' },
        HttpStatus.FORBIDDEN
      );
    }

    await this.userModel.updateOne({ _id: user.userId}, {
      $addToSet: {schoolsHistory: new Types.ObjectId(body.schoolId)},
      $inc: { ranking: 10 }
    })
  }

  async getRanking(page: number, size: number) {
    const users = await this.userModel
        .find({}, { _id: 1, username: 1, ranking: 1 })
        .sort({ ranking: -1 })
        .limit(size)
        .skip(page)
        .lean<User[]>()
        .exec();

    return users.map((u, index) => ({
        ...u,
        position: page + index + 1
    }));
}


  async getUnlockedSchools(userId: string): Promise<string[]> {
    const data = await this.userModel.findById(userId, {schoolsHistory: 1}).exec()
    return data?.schoolsHistory.map(el => String(el)) || []
  }
}
