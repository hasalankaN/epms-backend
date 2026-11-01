import { ApiProperty } from '@nestjs/swagger';

export class UpdateDashboardWidgetsDto {
  @ApiProperty({
    example: [
      { id: 'employee_count', visible: true, position: 1 },
      { id: 'leave_requests', visible: true, position: 2 },
    ],
    description: 'Array of widget configuration objects',
  })
  widgets: any;
}

