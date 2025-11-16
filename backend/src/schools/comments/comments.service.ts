import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from 'src/database/Comment';
import { User } from 'src/database/User';

@Injectable()
export class CommentsService {
    constructor(@InjectModel(Comment.name) private commentModel: Model<Comment>, @InjectModel(User.name) private userModel: Model<User>) {}

    async getComments(schoolId: string, page: number, size: number): Promise<any[]> {
        const comments =  await this.commentModel.find({schoolId: schoolId}).limit(size).skip(page).lean<Comment[] | void[]>().exec()
        const users = await this.userModel.find({_id: { $in: comments.map<Comment>((el) => el.userId) }});



        return comments.map<Comment>((el) => {
            const likes = el.likes?.length || 0
            el.likes = likes

            el.username = users.find((user) => user._id = el.userId)?.username

            return el
        }) || []
    }

    async createComment(body: {stars: number, content: string}, schoolId: string, userId: string): Promise<boolean> {
        if (!body.content || typeof body.stars != 'number')
  
        await this.commentModel.create({
            userId: userId,
            schoolId: schoolId,
            content: body.content,
            stars: body.stars,
            likes: []
        })    

        return true
    }


    async updateComment(body: { stars: number; content: string }, id: string, userId: string): Promise<Comment> {
        const comment = await this.commentModel.findOne({
            _id: id,
            userId: userId,
        });

        if (!comment) {
            throw new UnauthorizedException("Komentarz nie należy do ciebie albo nie istnieje.");
        }

        comment.content = body.content;
        comment.stars = body.stars;

        await comment.save();

        return comment;
    }


    async deleteComment(id: string): Promise<void> {
        await this.commentModel.findByIdAndDelete(id)
    }
}
