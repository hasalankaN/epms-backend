import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FirebaseModule } from './firebase/firebase.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';
import { EmployeeModule } from './employee/employee.module';
import { DepartmentModule } from './departments/department.module';
import { PositionsModule } from './positions/positions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    FirebaseModule,
    EmailModule,
    FilesModule,
    AuthModule,
    AdminModule,
    EmployeeModule,
    DepartmentModule,
    PositionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
