import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
                img: 1
            }
        }
        ]);

        return schools;
    }
}
