import { Controller, Post, Get, Patch, Delete, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-positions.dto';
import { PositionQueryDto } from './dto/pagination-query.dto';


@ApiTags('positions')
@Controller('positions')
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    @Post('create')
    @ApiOperation({ summary: 'Create a new position' })
    @ApiResponse({ status: 201, description: 'Position created successfully' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async create(@Body() dto: CreatePositionDto) {
        return this.positionsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List departments with pagination and search' })
    @ApiResponse({ status: 200, description: 'List of departments' })
    async list(@Query() query: PositionQueryDto) {
        return this.positionsService.listPositions(query);
    }
}