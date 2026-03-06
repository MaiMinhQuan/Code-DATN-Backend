import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import aiConfig from './config/ai.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Config Module - Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    DatabaseModule,
    AuthModule,
    UsersModule,

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
