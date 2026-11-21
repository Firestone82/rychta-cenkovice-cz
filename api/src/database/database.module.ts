import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type AppConfig, appConfig } from '../config/app.config.js';
import { typeOrmOptions } from './typeorm.options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => typeOrmOptions(config),
    }),
  ],
})
export class DatabaseModule {}
