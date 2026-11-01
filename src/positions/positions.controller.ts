import { Controller, Post, Get, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionQueryDto } from './dto/pagination-query.dto';

@ApiTags('positions')
@Controller('positions')
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    // POST /positions/create
    @Post('create')
    @ApiOperation({ summary: 'Create a new position' })
    @ApiResponse({ status: 201, description: 'Position created successfully' })
    async create(@Body() dto: CreatePositionDto) {
        return this.positionsService.create(dto);
    }

    // GET /positions  (with ?page=1&pageSize=10&search=...)
    @Get()
    @ApiOperation({ summary: 'List all positions with pagination and search' })
    @ApiResponse({ status: 200, description: 'List of positions' })
    async list(@Query() query: PositionQueryDto) {
        return this.positionsService.listPositions(query);
    }

    // GET /positions/:id
    @Get(':id')
    @ApiOperation({ summary: 'Get a single position by ID' })
    @ApiParam({ name: 'id', description: 'Position UUID' })
    @ApiResponse({ status: 200, description: 'Position details' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    async getOne(@Param('id') id: string) {
        return this.positionsService.getOne(id);
    }

    // PATCH /positions/:id
    @Patch(':id')
    @ApiOperation({ summary: 'Update a position' })
    @ApiParam({ name: 'id', description: 'Position UUID' })
    @ApiResponse({ status: 200, description: 'Position updated' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    async update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
        return this.positionsService.update(id, dto);
    }

    // DELETE /positions/:id
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a position' })
    @ApiParam({ name: 'id', description: 'Position UUID' })
    @ApiResponse({ status: 200, description: 'Position deleted' })
    @ApiResponse({ status: 404, description: 'Position not found' })
    async remove(@Param('id') id: string) {
        return this.positionsService.remove(id);
    }
}