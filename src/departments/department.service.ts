import { Injectable, Inject, BadRequestException, InternalServerErrorException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, or, sql, and, count, desc, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateDepartmentDto } from './dto/create-departments.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
        private readonly configService: ConfigService,
    ) { }

    async create(dto: CreateDepartmentDto) {
        try {
            const existingDepartment = await this.db.query.departments.findFirst({
                where: eq(schema.departments.departmentName, dto.departmentName),
            });

            if (existingDepartment) {
                throw new ConflictException('Department with this name already exists');
            }

            const [newDepartment] = await this.db
                .insert(schema.departments)
                .values({
                    departmentName: dto.departmentName,
                    location: dto.location,
                    deptPhone: dto.deptPhone,
                })
                .returning();

            return {
                message: 'Department created successfully',
                data: newDepartment,
            };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException(
                error.message || 'Failed to create department',
            );
        }
    }

    async listDepartments(query: DepartmentQueryDto) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const offset = (page - 1) * pageSize;

        try {
            const conditions: SQL[] = [];

            if (query.search && query.search.trim().length > 0) {
                const searchPattern = `%${query.search.trim()}%`;
                conditions.push(
                    or(
                        ilike(schema.departments.departmentName, searchPattern),
                        ilike(schema.departments.location, searchPattern),
                        ilike(schema.departments.deptPhone, searchPattern)
                    )!
                );
            }

            const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

            const [{ totalCount }] = await this.db
                .select({ totalCount: count() })
                .from(schema.departments)
                .where(whereCondition);

            const total = Number(totalCount) || 0;

            const data = await this.db
                .select()
                .from(schema.departments)
                .where(whereCondition)
                .orderBy(desc(schema.departments.createdAt))
                .limit(pageSize)
                .offset(offset);

            return {
                data,
                meta: {
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        } catch (err) {
            console.error('[DepartmentService][listDepartments] DB error:', err);
            throw new InternalServerErrorException('Database error while listing departments');
        }
    }

    async update(id: string, dto: UpdateDepartmentDto) {
        try {
            const existingDepartment = await this.db.query.departments.findFirst({
                where: eq(schema.departments.departmentId, id),
            });

            if (!existingDepartment) {
                throw new NotFoundException('Department not found');
            }

            if (dto.departmentName && dto.departmentName !== existingDepartment.departmentName) {
                const nameConflict = await this.db.query.departments.findFirst({
                    where: eq(schema.departments.departmentName, dto.departmentName),
                });
                if (nameConflict) {
                    throw new ConflictException('Department with this name already exists');
                }
            }

            const [updatedDepartment] = await this.db
                .update(schema.departments)
                .set({
                    ...dto,
                })
                .where(eq(schema.departments.departmentId, id))
                .returning();

            return {
                message: 'Department updated successfully',
                data: updatedDepartment,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
            throw new InternalServerErrorException('Failed to update department');
        }
    }

    async delete(id: string) {
        try {
            const existingDepartment = await this.db.query.departments.findFirst({
                where: eq(schema.departments.departmentId, id),
            });

            if (!existingDepartment) {
                throw new NotFoundException('Department not found');
            }

            await this.db
                .delete(schema.departments)
                .where(eq(schema.departments.departmentId, id));

            return {
                message: 'Department deleted successfully',
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Failed to delete department');
        }
    }
}