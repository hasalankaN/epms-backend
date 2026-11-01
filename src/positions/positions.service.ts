import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, eq, ilike, or, SQL } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreatePositionDto } from './dto/create-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionQueryDto } from './dto/pagination-query.dto';
import { generatePositionCode } from '../common/utils/code-generator.util';

@Injectable()
export class PositionsService {
    constructor(
        @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    // -------------------------------------------------------
    // CREATE — POST /positions/create
    // -------------------------------------------------------
    async create(dto: CreatePositionDto) {
        try {
            let positionCode = dto.positionCode?.trim();
            if (positionCode) {
                const existingCode = await this.db.query.positions.findFirst({
                    where: eq(schema.positions.position_code, positionCode),
                });
                if (existingCode) {
                    throw new InternalServerErrorException('Position code already exists');
                }
            } else {
                positionCode = await generatePositionCode(this.db);
            }

            const [newPosition] = await this.db
                .insert(schema.positions)
                .values({
                    position_code: positionCode,
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

    // -------------------------------------------------------
    // LIST — GET /positions
    // -------------------------------------------------------
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
                        ilike(schema.positions.position_code, searchPattern),
                        ilike(schema.positions.position_name, searchPattern),
                        ilike(schema.positions.description, searchPattern),
                        ilike(schema.positions.effective_date, searchPattern),
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

    // -------------------------------------------------------
    // GET ONE — GET /positions/:id
    // -------------------------------------------------------
    async getOne(id: string) {
        // find the position by its UUID
        const position = await this.db.query.positions.findFirst({
            where: eq(schema.positions.position_id, id),
        });

        // if nothing found, send 404
        if (!position) {
            throw new NotFoundException(`Position with id "${id}" not found`);
        }

        return position;
    }

    // -------------------------------------------------------
    // UPDATE — PATCH /positions/:id
    // -------------------------------------------------------
    async update(id: string, dto: UpdatePositionDto) {
        // make sure the position exists first (throws 404 if not)
        await this.getOne(id);

        // build only the fields that were actually sent in the request
        const updateData: Record<string, any> = { updated_at: new Date() };
        if (dto.positionName  !== undefined) updateData.position_name  = dto.positionName;
        if (dto.description   !== undefined) updateData.description    = dto.description;
        if (dto.effectiveDate !== undefined) updateData.effective_date = dto.effectiveDate;

        const [updated] = await this.db
            .update(schema.positions)
            .set(updateData)
            .where(eq(schema.positions.position_id, id))
            .returning();

        return {
            message: 'Position updated successfully',
            data: updated,
        };
    }

    // -------------------------------------------------------
    // DELETE — DELETE /positions/:id
    // -------------------------------------------------------
    async remove(id: string) {
        // make sure the position exists first (throws 404 if not)
        await this.getOne(id);

        await this.db
            .delete(schema.positions)
            .where(eq(schema.positions.position_id, id));

        return { message: 'Position deleted successfully' };
    }
}