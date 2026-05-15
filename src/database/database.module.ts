// Module Database: kết nối MongoDB và export các model đã đăng ký
import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {ConfigService} from "@nestjs/config";
import {databaseProviders} from "./database.providers";

@Module({
  imports: [
    // Kết nối MongoDB bằng URI từ config; tự động thử lại tối đa 3 lần khi thất bại
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("database.uri"),
        retryAttempts: 3,
        retryDelay: 1000,
        connectionFactory: (connection) => {
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
    // Đăng ký tất cả schema để có thể inject qua @InjectModel
    ...databaseProviders,
  ],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
