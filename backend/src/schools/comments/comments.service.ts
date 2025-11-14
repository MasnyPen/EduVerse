import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from 'src/database/Comment';

@Injectable()
export class CommentsService {
    constructor(@InjectModel(Comment.name) private commentModel: Model<Comment>) {}

    async getComments(schoolId: string, page: number, size: number): Promise<Comment[]> {
        const comments =  await this.commentModel.find({schoolId: schoolId}).limit(size).skip(page).lean<Comment[] | void[]>().exec()

        return comments.map<Comment>((el) => {
            const likes = el.likes?.length || 0
            el.likes = likes
            return el
        }) || []
    }



    async createComment(body: {stars: number, content: string}, schoolId: string, userId: string): Promise<Boolean> {
        await this.commentModel.create({
            userId: userId,
            schoolId: schoolId,
            content: body.content,
            stars: body.stars,
            likes: []
        })

        return true
    }


    async updateComment(body: {stars: number, content: string}, id: string, userId: string): Promise<Comment> {
        const comment = await this.commentModel.findById(id).lean<Comment>().exec()

        if (comment == null) {
            throw new BadRequestException("Komentarz nie istnieje.")
        }

        if (String(comment?.userId) != userId) {
            throw new UnauthorizedException("Komentarz nie należy do ciebie.")
        }

        await comment?.updateOne({content: body.content, stars: body.stars})

        return comment
    }

    async deleteComment(id: string): Promise<void> {
        await this.commentModel.findByIdAndDelete(id)
    }
}
