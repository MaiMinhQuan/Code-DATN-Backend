import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {ConfigService} from "@nestjs/config";
import {databaseProviders} from "./database.providers";

@Module({
  imports: [
    // Kết nối MongoDB với async configuration
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("database.uri"),
        // Connection options
        retryAttempts: 3,
        retryDelay: 1000,
        connectionFactory: (connection) => {
          // Log khi kết nối thành công
          connection.on("connected", () => {
            console.log("MongoDB connected successfully");
          });
          connection.on("error", (error) => {
            console.error("MongoDB connection error:", error);
          });
          return connection;
        },
      }),
    }),
    ...databaseProviders,
  ],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
