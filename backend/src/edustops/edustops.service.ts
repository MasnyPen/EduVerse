import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EduStop } from 'src/database/EduStop';

@Injectable()
export class EdustopsService {

    constructor(@InjectModel(EduStop.name) private eduStopModel: Model<EduStop>) {}

    async searchEduStopByRadius(body: any, radius: number) {
        const { latitude, longitude } = body;

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

        const edustops = await this.eduStopModel.aggregate([
        {
            $addFields: {
            distanceKm: {
                $sqrt: {
                $add: [
                    {
                    $pow: [
                        {
                        $multiply: [
                            { $subtract: ["$latitude", lat] },
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
                            $subtract: ["$longitude", lon],
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
                latitude: 1,
                longitude: 1
            }
        }
        ]);

        return edustops;
    }
    
    async getEduStopFromId(id: string) {
        return this.eduStopModel.findById(id).exec()
    }

    async createEduStop(body: {name: string, latitude: number, longitude: number}) {
        if (!body || !body.name || !body.latitude || !body.longitude) {
            throw new BadRequestException("Dane są nieprawidłowe.")
        }

        await this.eduStopModel.create(body)
        return true
    }

    async updateEduStop(body: {name: string, latitude: number, longitude: number}, id: string) {
        const edustop = await this.eduStopModel.findById(id)

        if (!edustop) {
            throw new BadRequestException("Taki edustop nie istnieje.")
        }

        if (!body) {
            throw new BadRequestException("Nie prawidłowe dane.")
        }

        if (body.name) edustop.name = body.name
        if (body.latitude) edustop.latitude = body.latitude
        if (body.longitude) edustop.longitude = body.longitude

        await edustop.save()

        return edustop
    }

    async deleteEduStop(id: string) {
        await this.eduStopModel.deleteOne({ _id: id})

        return true
    }


}
