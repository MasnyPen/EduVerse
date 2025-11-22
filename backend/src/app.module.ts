import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { redisStore } from 'cache-manager-redis-store';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { CommentsModule } from './schools/comments/comments.module';
import { CalendarModule } from './calendar/calendar.module';
import { GuardsModule } from './guards/guards.module';
import { EdustopsModule } from './edustops/edustops.module';
import { TasksModule } from './tasks/tasks.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    
    // ConfigModule
    ConfigModule.forRoot({ isGlobal: true }),

    // Connect to MongoDB database
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://root:secret@localhost:27017/EduVerse?authSource=admin', {
        
      }
    ),

    // Connect to Redis
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
          },
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD,
          ttl: 60,
        }),
      }),
      isGlobal: true,
    }),

    // Modules
    AuthModule,
    UsersModule,
    SchoolsModule,
    CalendarModule,
    GuardsModule,
    EdustopsModule,
    TasksModule,
    DatabaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
