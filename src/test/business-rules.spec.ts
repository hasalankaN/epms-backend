/**
 * Business-rule unit tests for EPMS backend.
 * Run with: yarn test
 *
 * These tests mock the DB layer so they run without a live PostgreSQL instance.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { MeService } from '../me/me.service';
import { SupervisorService } from '../supervisor/supervisor.service';
import { AdminService } from '../admin/admin.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

function makeDb(overrides: Record<string, jest.Mock> = {}) {
  const txMock: Record<string, jest.Mock> = {};
  const base: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    query: { users: { findFirst: jest.fn() } },
    // transaction: runs the callback immediately with a copy of the same mock
    transaction: jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(base)),
    ...overrides,
  };
  return base;
}

// ---------------------------------------------------------------------------
// 1.  Wrong role → 403
// ---------------------------------------------------------------------------
describe('RolesGuard', () => {
  it('should reflect that SupervisorController requires SUPERVISOR | ADMIN | HR', () => {
    // Load the actual decorator metadata (no HTTP server needed)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SupervisorController } = require('../supervisor/supervisor.controller');
    const roles: string[] = Reflect.getMetadata('roles', SupervisorController);
    expect(roles).toBeDefined();
    expect(roles).toContain('supervisor');
  });

  it('should reflect that HrController requires HR | ADMIN', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HrController } = require('../hr/hr.controller');
    const roles: string[] = Reflect.getMetadata('roles', HrController);
    expect(roles).toBeDefined();
    expect(roles).toContain('hr');
  });
});

// ---------------------------------------------------------------------------
// 2.  clockIn — second clock-in same day returns 409
// ---------------------------------------------------------------------------
describe('MeService.clockIn', () => {
  let service: MeService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: DATABASE_CONNECTION, useValue: db },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(MeService);
  });

  it('throws 409 ConflictException when employee has already clocked in today', async () => {
    // getEmployeeByUserId → returns a fake employee
    db.query = {
      ...db.query,
      users: { findFirst: jest.fn().mockResolvedValue({ user_id: 'u1', role: 'employee' }) },
    };
    // .select().from().where() → the first call (find employee) returns employee row
    // the second call (check existing attendance) returns a record with punch_in set
    db.where = jest
      .fn()
      // First call: find employee by user_id
      .mockResolvedValueOnce([{ employee_id: 'emp1', user_id: 'u1' }])
      // Second call: find attendance for today
      .mockResolvedValueOnce([{ attendance_id: 'att1', punch_in: '09:00:00', date: new Date().toISOString().slice(0, 10) }]);

    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();

    await expect(service.clockIn('u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a new attendance record on first clock-in', async () => {
    db.query = {
      ...db.query,
      users: { findFirst: jest.fn().mockResolvedValue({ user_id: 'u1', role: 'employee' }) },
    };
    db.where = jest
      .fn()
      .mockResolvedValueOnce([{ employee_id: 'emp1', user_id: 'u1' }])   // employee lookup
      .mockResolvedValueOnce([]);                                          // no existing attendance

    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();
    db.insert = jest.fn().mockReturnThis();
    db.values = jest.fn().mockReturnThis();
    db.returning = jest.fn().mockResolvedValue([{ attendance_id: 'att2', status: 'PRESENT' }]);

    const result = await service.clockIn('u1');
    expect(result).toMatchObject({ attendance_id: 'att2' });
  });
});

// ---------------------------------------------------------------------------
// 3.  Leave approval — balance deduction is inside a transaction
// ---------------------------------------------------------------------------
describe('SupervisorService.decideLeave — transactional', () => {
  let service: SupervisorService;
  let txSpy: jest.Mock;

  const fakeLeave = {
    leave_id: 'lv1',
    emp_id: 'emp1',
    leave_type: 'ANNUAL',
    start_date: '2026-01-10',
    end_date: '2026-01-12',
    days: '3',
    status: 'PENDING',
  };
  const fakeBalance = {
    balance_id: 'bal1',
    emp_id: 'emp1',
    leave_type: 'ANNUAL',
    year: 2026,
    balance: '15',
    used: '0',
    pending: '3',
  };
  const fakeEmployee = {
    employee_id: 'emp1',
    user_id: 'u2',
    supervisor_id: 'sup1',
    first_name: 'John',
    last_name: 'Doe',
  };
  const fakeSupervisor = { employee_id: 'sup1', user_id: 'sup-user' };

  beforeEach(async () => {
    // Build a fluent mock that tracks call order for outer db queries
    let outerCall = 0;
    const outerResponses = [
      [fakeSupervisor],   // getSupervisorEmployee → select from employees where user_id
      [fakeLeave],        // select leave by id
      [fakeEmployee],     // team membership check
      [fakeBalance],      // balance lookup (before tx)
    ];

    // Build a fluent tx mock that always returns the updated leave from .returning()
    const makeFluent = (resolveWith: any[]) => {
      const fluent: any = {};
      fluent.select = jest.fn().mockReturnValue(fluent);
      fluent.from = jest.fn().mockReturnValue(fluent);
      fluent.update = jest.fn().mockReturnValue(fluent);
      fluent.set = jest.fn().mockReturnValue(fluent);
      fluent.where = jest.fn().mockReturnValue(fluent);
      fluent.returning = jest.fn().mockResolvedValue(resolveWith);
      fluent.insert = jest.fn().mockReturnValue(fluent);
      fluent.values = jest.fn().mockReturnValue(fluent);
      return fluent;
    };

    const txFluent = makeFluent([{ ...fakeLeave, status: 'APPROVED' }]);

    txSpy = jest.fn().mockImplementation(async (cb: any) => cb(txFluent));

    const outerFluent: any = {};
    outerFluent.select = jest.fn().mockReturnValue(outerFluent);
    outerFluent.from = jest.fn().mockReturnValue(outerFluent);
    outerFluent.update = jest.fn().mockReturnValue(outerFluent);
    outerFluent.set = jest.fn().mockReturnValue(outerFluent);
    outerFluent.where = jest.fn().mockImplementation(() => {
      return Promise.resolve(outerResponses[outerCall++] ?? []);
    });
    outerFluent.transaction = txSpy;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorService,
        { provide: DATABASE_CONNECTION, useValue: outerFluent },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(SupervisorService);
  });

  it('calls db.transaction() when approving a leave', async () => {
    await service.decideLeave('sup-user', 'lv1', { decision: 'APPROVED' });
    expect(txSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 4.  deleteEmployee — unknown id returns 404
// ---------------------------------------------------------------------------
describe('AdminService.deleteEmployee', () => {
  let service: AdminService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DATABASE_CONNECTION, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: {} },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it('returns 404 NotFoundException for an unknown employee id', async () => {
    // delete().where().returning() → empty array means nothing was deleted
    db.delete = jest.fn().mockReturnThis();
    db.where = jest.fn().mockReturnThis();
    db.returning = jest.fn().mockResolvedValue([]); // no rows → not found

    await expect(service.deleteEmployee('nonexistent-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns success message when employee is deleted', async () => {
    db.delete = jest.fn().mockReturnThis();
    db.where = jest.fn().mockReturnThis();
    db.returning = jest.fn().mockResolvedValue([{ employee_id: 'emp1' }]);

    const result = await service.deleteEmployee('emp1');
    expect(result).toMatchObject({ message: 'Employee deleted successfully' });
  });
});

// ---------------------------------------------------------------------------
// 5.  Cannot delete the last active admin
// ---------------------------------------------------------------------------
describe('AdminService.deleteOrDeactivateAccount — last admin guard', () => {
  let service: AdminService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DATABASE_CONNECTION, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: {} },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it('throws 400 BadRequestException when deleting the only active admin', async () => {
    // query.users.findFirst → returns an active admin
    db.query = {
      users: {
        findFirst: jest.fn().mockResolvedValue({ user_id: 'admin1', role: 'admin', status: 'ACTIVE' }),
      },
    };
    // select().from().where() → count query returns 1
    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();
    db.where = jest.fn().mockResolvedValue([{ cnt: 1 }]);

    await expect(
      service.deleteOrDeactivateAccount('admin1', 'delete'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows deletion when 2+ active admins exist', async () => {
    db.query = {
      users: {
        findFirst: jest.fn().mockResolvedValue({ user_id: 'admin1', role: 'admin', status: 'ACTIVE' }),
      },
    };
    // count returns 2
    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();
    db.where = jest.fn()
      .mockResolvedValueOnce([{ cnt: 2 }])                     // count query
      .mockReturnThis();                                        // delete chain
    db.delete = jest.fn().mockReturnThis();
    db.returning = jest.fn().mockResolvedValue([{ user_id: 'admin1' }]);

    const result = await service.deleteOrDeactivateAccount('admin1', 'delete');
    expect(result).toMatchObject({ message: 'Account deleted successfully' });
  });
});

// ---------------------------------------------------------------------------
// 6.  Cannot delete a role that has users
// ---------------------------------------------------------------------------
describe('AdminService.deleteRole — role in use guard', () => {
  let service: AdminService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DATABASE_CONNECTION, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: {} },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it('throws 400 BadRequestException when role has assigned users', async () => {
    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();
    db.where = jest.fn()
      .mockResolvedValueOnce([{ role_id: 'r1', name: 'hr' }])  // role lookup
      .mockResolvedValueOnce([{ count: 3 }]);                   // count of users with that role

    await expect(service.deleteRole('r1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes the role when no users are assigned', async () => {
    db.select = jest.fn().mockReturnThis();
    db.from = jest.fn().mockReturnThis();
    db.where = jest.fn()
      .mockResolvedValueOnce([{ role_id: 'r2', name: 'unused-role' }]) // role lookup
      .mockResolvedValueOnce([{ count: 0 }]);                           // count query
    db.delete = jest.fn().mockReturnThis();

    const result = await service.deleteRole('r2');
    expect(result).toMatchObject({ message: 'Role deleted successfully' });
  });
});
