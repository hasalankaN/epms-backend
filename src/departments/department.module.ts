import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        JwtModule.register({ global: true }),
        DatabaseModule,
        EmailModule,
        AuthModule,
    ],
    controllers: [DepartmentController],
    providers: [DepartmentService],
    exports: [DepartmentService],
})
export class DepartmentModule { }
