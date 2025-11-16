import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { School } from 'src/database/School';

@Injectable()
export class SchoolsService {

    constructor(@InjectModel(School.name) private schoolModel: Model<School>) {}

    async searchSchoolsByRadius(req: any, radius: number): Promise<School[] | null> {
        const { latitude, longitude } = req.body;

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const r = Number(radius);

        if (
            isNaN(lat) || isNaN(lon) ||
            lat < -90 || lat > 90 ||
            lon < -180 || lon > 180 ||
            isNaN(r) || r <= 0
        ) {
            throw new BadRequestException('Nie prawidłowe koordynaty');
        }

        const schools = await this.schoolModel.aggregate([
        {
            $addFields: {
            distanceKm: {
                $sqrt: {
                $add: [
                    {
                    $pow: [
                        {
                        $multiply: [
                            { $subtract: ["$coordinates.latitude", lat] },
                            111,
                        ],
                        },
                        2,
                    ],
                    },
                    {
                    $pow: [
                        {
                        $multiply: [
                            {
                            $subtract: ["$coordinates.longitude", lon],
                            },
                            {
                            $multiply: [111, { $cos: { $degreesToRadians: lat } }],
                            },
                        ],
                        },
                        2,
                    ],
                    },
                ],
                },
            },
            },
        },
        {
            $match: { distanceKm: { $lte: radius } },
        },
        {
            $sort: { distanceKm: 1 },
        },
        {
            $project: {
                name: 1,
                _id: 1,
                img: 1,
                coordinates: 1
            }
        }
        ]);

        return schools;
    }


    async getSchool(id: string, userId: string): Promise<any> {
        const school = await this.schoolModel.findById(id).lean<School>().exec()

        if (school != null) {
            
            const { likes, ...results } = school         

            const newSchool = {
                likes: likes?.length || 0,
                liked: likes.map(el => String(el)).includes(userId),
                ...results
            }

            return newSchool
        } else {
            throw new NotFoundException("Nie znaleziono szkoły.")
        }
    }

    async addLikeToSchool(schoolId: string, userId: string): Promise<void> {
        const userObjectId = new Types.ObjectId(userId);
        const school = await this.schoolModel.findById(schoolId);

        if (!school) throw new Error("Szkoła nie istnieje.");

        try {
            await this.schoolModel.updateOne(
                { _id: schoolId },
                { $addToSet: { likes: userObjectId } }
            );
        } catch (e) {
            throw new HttpException(
                { message: 'Wystąpił błąd w dodawaniu polubienia.' },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async removeLikeFromSchool(schoolId: string, userId: string): Promise<void> {
        const userObjectId = new Types.ObjectId(userId);
        const school = await this.schoolModel.findById(schoolId);

        if (!school) throw new Error("Szkoła nie istnieje.");

        try {
            await this.schoolModel.updateOne(
                { _id: schoolId },
                { $pull: { likes: userObjectId } }
            );
        } catch (e) {
            throw new HttpException(
                { message: 'Wystąpił błąd w usuwaniu polubienia.' },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
