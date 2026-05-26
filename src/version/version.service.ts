import { Injectable } from "@nestjs/common";
import { APP_VERSION } from "./app-version";

@Injectable()
export class VersionService {
  getInfo() {
    return {
      version: APP_VERSION,
      name: "ielts-writing-backend",
    };
  }
}
