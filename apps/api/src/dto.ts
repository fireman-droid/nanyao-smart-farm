import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TaskKind } from '@prisma/client';

const Trim = () => Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value);

export class HerbDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(120) scientificName!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(40) family!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) part!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(120) region!: string;
  @Trim() @IsString() @MaxLength(3000) description!: string;
  @IsInt() @Min(1) @Max(5000) growthDays!: number;
  @IsNumber() @Min(-30) @Max(60) tempMin!: number;
  @IsNumber() @Min(-30) @Max(60) tempMax!: number;
  @IsNumber() @Min(0) @Max(100) moistureMin!: number;
  @IsNumber() @Min(0) @Max(100) moistureMax!: number;
}
export class PlotDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(160) location!: string;
  @IsNumber() @Min(0.01) @Max(100000) area!: number;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) soil!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(40) manager!: string;
}
export class BatchDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(40) code!: string;
  @IsInt() @Min(1) herbId!: number;
  @IsInt() @Min(1) plotId!: number;
  @IsDateString({ strict: true }) plantedAt!: string;
  @IsDateString({ strict: true }) expectedAt!: string;
  @IsInt() @Min(1) @Max(100000000) quantity!: number;
  @IsOptional() @Trim() @IsString() @MaxLength(500) notes?: string;
}
export class TaskDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(100) title!: string;
  @IsEnum(TaskKind) kind!: TaskKind;
  @IsInt() @Min(1) batchId!: number;
  @IsInt() @Min(1) assigneeId!: number;
  @IsDateString({ strict: true }) dueAt!: string;
  @IsOptional() @Trim() @IsString() @MaxLength(500) notes?: string;
}
export class CompleteDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(500) result!: string;
}
export class ResolveDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(500) resolution!: string;
}
export class SimulateDto {
  @IsInt() @Min(1) plotId!: number;
  @IsOptional() @IsEnum({ NORMAL: 'NORMAL', DRY: 'DRY', HOT: 'HOT' }) scenario?: 'NORMAL' | 'DRY' | 'HOT';
}
export class HarvestDto {
  @IsInt() @Min(1) batchId!: number;
  @IsDateString({ strict: true }) harvestedAt!: string;
  @IsNumber() @Min(0.01) @Max(100000000) weight!: number;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(30) grade!: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(120) destination!: string;
  @IsOptional() @Trim() @IsString() @MaxLength(500) notes?: string;
}
