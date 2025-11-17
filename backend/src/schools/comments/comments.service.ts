import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from 'src/database/Comment';
import { User } from 'src/database/User';

@Injectable()
export class CommentsService {
    constructor(@InjectModel(Comment.name) private commentModel: Model<Comment>, @InjectModel(User.name) private userModel: Model<User>) {}

    async getComments(schoolId: string, page: number, size: number, userId: string): Promise<any[]> {
        const comments =  await this.commentModel.find({schoolId: schoolId}).limit(size).skip(page).lean<Comment[] | void[]>().exec()
        const users = await this.userModel.find({_id: { $in: comments.map<Comment>((el) => el.userId) }});

        return comments.map<Comment>((el) => {
            if (el.likes.some(el => el.toString() === userId)) {
                el.liked = true
            }

            const likes = el.likes?.length || 0
            el.likes = likes

            el.username = users.find((user) => user._id = el.userId)?.username

            return el
        }) || []
    }

    async createComment(body: {stars: number, content: string}, schoolId: string, userId: string): Promise<boolean> {
        if (!body.content || typeof body.stars != 'number') {
            throw new BadRequestException("Komenatrz musi posiadać treść i ocene")
        }

        await this.commentModel.create({
            userId: userId,
            schoolId: schoolId,
            content: body.content,
            stars: body.stars,
            likes: []
        })    

        await this.userModel.updateOne({ _id: userId}, {
            $inc: { ranking: 5 }
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

        if (body.content) comment.content = body.content;
        if (comment.stars) comment.stars = body.stars;
        
        await comment.save();

        return comment;
    }


    async deleteComment(id: string, userId: string): Promise<void> {
        const comment = await this.commentModel.findById(id).exec()
        
        if (comment?.$isDeleted){
            comment.deleteOne().exec()
            await this.userModel.updateOne({ _id: userId}, {
                $inc: { ranking: -5 }
            })
        }
    }

    async addLikeToComment(comId: string, userId: string) {
        const userObjectId = new Types.ObjectId(userId);
        const comment = await this.commentModel.findById(comId);

        if (!comment) throw new Error("Komentarz nie istnieje.");

        try {
            await this.commentModel.updateOne(
                { _id: comId },
                { $addToSet: { likes: userObjectId } }
            );
        } catch (e) {
            throw new HttpException(
                    { message: 'Wystąpił błąd w dodawaniu polubienia.' },
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    );
        }

        return 
    }

    async removeLikeToComment(comId: string, userId: string) {
        const userObjectId = new Types.ObjectId(userId);
        const comment = await this.commentModel.findById(comId);

        if (!comment) throw new Error("Komentarz nie istnieje.");

        try {
            await this.commentModel.updateOne(
                { _id: comId },
                { $pull: { likes: userObjectId } }
            );
        } catch (e) {
            throw new HttpException(
                    { message: 'Wystąpił błąd w dodawaniu polubienia.' },
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    );
        }

        return
    }
}
