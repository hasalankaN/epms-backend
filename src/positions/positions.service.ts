import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreatePositionDto } from './dto/create-positions.dto';
import { PositionQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class PositionsService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async create(dto: CreatePositionDto) {
        try {
            const [newPosition] = await this.db
                .insert(schema.positions)
                .values({
                    position_name: dto.positionName,
                    description: dto.description,
                    effective_date: dto.effectiveDate ? dto.effectiveDate : null,
                })
                .returning();

            return {
                message: 'Position created successfully',
                data: newPosition,
            };
        } catch (error) {
            throw new InternalServerErrorException(
                error.message || 'Failed to create position',
            );
        }
    }

    async listPositions(query: PositionQueryDto) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 10;
        const offset = (page - 1) * pageSize;

        try {
            const conditions: SQL[] = [];

            if (query.search && query.search.trim().length > 0) {
                const searchPattern = `%${query.search.trim()}%`;
                conditions.push(
                    or(
                        ilike(schema.positions.position_name, searchPattern),
                        ilike(schema.positions.description, searchPattern),
                        ilike(schema.positions.effective_date, searchPattern)
                    )!
                );
            }

            const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

            const [{ totalCount }] = await this.db
                .select({ totalCount: count() })
                .from(schema.positions)
                .where(whereCondition);

            const total = Number(totalCount) || 0;

            const data = await this.db
                .select()
                .from(schema.positions)
                .where(whereCondition)
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
            console.error('[PositionService][listPositions] DB error:', err);
            throw new InternalServerErrorException('Database error while listing positions');
        }
    }
}