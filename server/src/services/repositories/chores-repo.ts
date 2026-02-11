import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ChoreRecord {
  id: string;
  name?: string | null;
  title: string | null;
  description: string | null;
  emoji: string | null;
  frequency: string | null;
  completionType?: string | null;
  scheduleType: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  dueTime: string | null;
  points: number;
  active: boolean;
  sortOrder: number;
  categoryIds?: any;  // JSON array
  categoryPoints?: any;  // JSON array
  desiredTime?: string | null;
  timeOfDay?: string | null;
  timeWindow?: any;  // JSON object
  estimatedDuration?: number | null;
  approvalConfigs?: any;  // JSON array
  maxCompletions?: number | null;
  resetPeriod?: string | null;
  weatherConditions?: any;  // JSON object
  speakDescription?: boolean | null;
  inactiveOnSchoolHolidays?: boolean | null;
  onlyOnSchoolHolidays?: boolean | null;
  rotationConfig?: any;  // JSON object
  createdAt?: number | null;
}

interface ChoreRow extends RowDataPacket {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  emoji: string | null;
  frequency: string | null;
  completion_type: string | null;
  schedule_type: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  due_time: string | null;
  points: number | null;
  is_active: number | boolean | null;
  sort_order: number | null;
  category_ids?: string | null;
  category_points?: string | null;
  desired_time?: string | null;
  time_of_day?: string | null;
  time_window?: string | null;
  estimated_duration?: number | null;
  approval_configs?: string | null;
  max_completions?: number | null;
  reset_period?: string | null;
  weather_conditions?: string | null;
  speak_description?: number | boolean | null;
  inactive_on_school_holidays?: number | boolean | null;
  only_on_school_holidays?: number | boolean | null;
  rotation_config?: string | null;
  created_at_timestamp?: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

// Helper function to get chore name value with fallback to title
// This maintains backward compatibility where 'name' and 'title' are used interchangeably
function getChoreNameValue(chore: ChoreRecord): string | null {
  return chore.name ?? chore.title ?? null;
}

function mapRow(row: ChoreRow): ChoreRecord {
  // Helper function to safely parse JSON fields
  const parseJson = (value: string | null | undefined) => {
    if (!value) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      console.error('Failed to parse JSON value:', value, error);
      
      // Try to fix malformed JSON with single quotes instead of double quotes
      // This handles cases where data was stored with JavaScript array notation instead of JSON
      if (typeof value === 'string' && value.includes("'")) {
        const fixedValue = value.replace(/'/g, '"');
        try {
          const parsed = JSON.parse(fixedValue);
          console.warn('Successfully parsed JSON after replacing single quotes with double quotes:', value, '->', fixedValue);
          return parsed;
        } catch (secondError) {
          console.error('Failed to parse even after fixing quotes:', fixedValue, secondError);
        }
      }
      
      return null;
    }
  };

  return {
    id: row.id,
    name: row.name,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    frequency: row.frequency,
    completionType: row.completion_type,
    scheduleType: row.schedule_type,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    dueTime: row.due_time,
    points: row.points ?? 0,
    active: Boolean(row.is_active ?? true),
    sortOrder: row.sort_order ?? 0,
    categoryIds: parseJson(row.category_ids),
    categoryPoints: parseJson(row.category_points),
    desiredTime: row.desired_time,
    timeOfDay: row.time_of_day,
    timeWindow: parseJson(row.time_window),
    estimatedDuration: row.estimated_duration,
    approvalConfigs: parseJson(row.approval_configs),
    maxCompletions: row.max_completions,
    resetPeriod: row.reset_period,
    weatherConditions: parseJson(row.weather_conditions),
    speakDescription: row.speak_description !== null ? Boolean(row.speak_description) : null,
    inactiveOnSchoolHolidays: row.inactive_on_school_holidays !== null ? Boolean(row.inactive_on_school_holidays) : null,
    onlyOnSchoolHolidays: row.only_on_school_holidays !== null ? Boolean(row.only_on_school_holidays) : null,
    rotationConfig: parseJson(row.rotation_config),
    createdAt: row.created_at_timestamp,
  };
}

export async function listChores(tenantId: string, connection?: PoolConnection): Promise<ChoreRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChoreRow[]>(
    `SELECT id, name, title, description, emoji, frequency, completion_type, schedule_type, 
            day_of_week, day_of_month, due_time, points, is_active, sort_order,
            category_ids, category_points, desired_time, time_of_day, time_window,
            estimated_duration, approval_configs, max_completions, reset_period,
            weather_conditions, speak_description, inactive_on_school_holidays,
            only_on_school_holidays, rotation_config, created_at_timestamp
     FROM tenant_chores_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );

  return rows.map(mapRow);
}


export async function getChoreById(tenantId: string, choreId: string, connection?: PoolConnection): Promise<ChoreRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChoreRow[]>(
    `SELECT id, name, title, description, emoji, frequency, completion_type, schedule_type,
            day_of_week, day_of_month, due_time, points, is_active, sort_order,
            category_ids, category_points, desired_time, time_of_day, time_window,
            estimated_duration, approval_configs, max_completions, reset_period,
            weather_conditions, speak_description, inactive_on_school_holidays,
            only_on_school_holidays, rotation_config, created_at_timestamp
     FROM tenant_chores_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, choreId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChore(tenantId: string, chore: ChoreRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  const sortOrder = chore.sortOrder ?? 0;
  
  // Helper function to safely stringify JSON fields
  const stringifyJson = (value: any) => {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  await executor.query(
    `INSERT INTO tenant_chores_v2
    (id, tenant_id, name, title, description, emoji, frequency, completion_type, schedule_type,
     day_of_week, day_of_month, due_time, points, is_active, sort_order,
     category_ids, category_points, desired_time, time_of_day, time_window,
     estimated_duration, approval_configs, max_completions, reset_period,
     weather_conditions, speak_description, inactive_on_school_holidays,
     only_on_school_holidays, rotation_config, created_at_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      title = VALUES(title),
      description = VALUES(description),
      emoji = VALUES(emoji),
      frequency = VALUES(frequency),
      completion_type = VALUES(completion_type),
      schedule_type = VALUES(schedule_type),
      day_of_week = VALUES(day_of_week),
      day_of_month = VALUES(day_of_month),
      due_time = VALUES(due_time),
      points = VALUES(points),
      is_active = VALUES(is_active),
      sort_order = VALUES(sort_order),
      category_ids = VALUES(category_ids),
      category_points = VALUES(category_points),
      desired_time = VALUES(desired_time),
      time_of_day = VALUES(time_of_day),
      time_window = VALUES(time_window),
      estimated_duration = VALUES(estimated_duration),
      approval_configs = VALUES(approval_configs),
      max_completions = VALUES(max_completions),
      reset_period = VALUES(reset_period),
      weather_conditions = VALUES(weather_conditions),
      speak_description = VALUES(speak_description),
      inactive_on_school_holidays = VALUES(inactive_on_school_holidays),
      only_on_school_holidays = VALUES(only_on_school_holidays),
      rotation_config = VALUES(rotation_config),
      created_at_timestamp = VALUES(created_at_timestamp)`,
    [
      chore.id,
      tenantId,
      getChoreNameValue(chore),
      chore.title ?? null,
      chore.description ?? null,
      chore.emoji ?? null,
      chore.frequency ?? null,
      chore.completionType ?? null,
      chore.scheduleType ?? null,
      chore.dayOfWeek ?? null,
      chore.dayOfMonth ?? null,
      chore.dueTime ?? null,
      chore.points ?? 0,
      chore.active ?? true,
      sortOrder,
      stringifyJson(chore.categoryIds),
      stringifyJson(chore.categoryPoints),
      chore.desiredTime ?? null,
      chore.timeOfDay ?? null,
      stringifyJson(chore.timeWindow),
      chore.estimatedDuration ?? null,
      stringifyJson(chore.approvalConfigs),
      chore.maxCompletions ?? null,
      chore.resetPeriod ?? null,
      stringifyJson(chore.weatherConditions),
      chore.speakDescription ?? null,
      chore.inactiveOnSchoolHolidays ?? null,
      chore.onlyOnSchoolHolidays ?? null,
      stringifyJson(chore.rotationConfig),
      chore.createdAt ?? null,
    ]
  );
}

export async function replaceChores(tenantId: string, chores: ChoreRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ?', [tenantId]);

  // Helper function to safely stringify JSON fields
  const stringifyJson = (value: any) => {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  for (const [index, chore] of chores.entries()) {
    const sortOrder = chore.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_chores_v2
      (id, tenant_id, name, title, description, emoji, frequency, completion_type, schedule_type,
       day_of_week, day_of_month, due_time, points, is_active, sort_order,
       category_ids, category_points, desired_time, time_of_day, time_window,
       estimated_duration, approval_configs, max_completions, reset_period,
       weather_conditions, speak_description, inactive_on_school_holidays,
       only_on_school_holidays, rotation_config, created_at_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chore.id,
        tenantId,
        getChoreNameValue(chore),
        chore.title ?? null,
        chore.description ?? null,
        chore.emoji ?? null,
        chore.frequency ?? null,
        chore.completionType ?? null,
        chore.scheduleType ?? null,
        chore.dayOfWeek ?? null,
        chore.dayOfMonth ?? null,
        chore.dueTime ?? null,
        chore.points ?? 0,
        chore.active ?? true,
        sortOrder,
        stringifyJson(chore.categoryIds),
        stringifyJson(chore.categoryPoints),
        chore.desiredTime ?? null,
        chore.timeOfDay ?? null,
        stringifyJson(chore.timeWindow),
        chore.estimatedDuration ?? null,
        stringifyJson(chore.approvalConfigs),
        chore.maxCompletions ?? null,
        chore.resetPeriod ?? null,
        stringifyJson(chore.weatherConditions),
        chore.speakDescription ?? null,
        chore.inactiveOnSchoolHolidays ?? null,
        chore.onlyOnSchoolHolidays ?? null,
        stringifyJson(chore.rotationConfig),
        chore.createdAt ?? null,
      ]
    );
  }
}

export async function deleteChores(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteChoreById(tenantId: string, choreId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ? AND id = ?', [tenantId, choreId]);
}
