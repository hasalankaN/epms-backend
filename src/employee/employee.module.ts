import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        JwtModule.register({ global: true }),
        DatabaseModule,
        EmailModule,
    ],
    controllers: [EmployeeController],
    providers: [EmployeeService],
    exports: [EmployeeService],
})
export class EmployeeModule { }
