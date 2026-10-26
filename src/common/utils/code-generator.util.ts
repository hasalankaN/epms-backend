import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../database/schema';

/**
 * Generate readable department code: DEP-0001, DEP-0002, etc.
 */
export async function generateDepartmentCode(db: NodePgDatabase<typeof schema>): Promise<string> {
  const result = await db.execute(sql`
    SELECT department_code 
    FROM departments 
    WHERE department_code ~ '^DEP-[0-9]+$' 
    ORDER BY CAST(SUBSTRING(department_code FROM 5) AS INTEGER) DESC 
    LIMIT 1
  `);
  let nextNum = 1;
  if (result.rows.length > 0 && result.rows[0].department_code) {
    const lastCode = result.rows[0].department_code as string;
    const numPart = parseInt(lastCode.replace('DEP-', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `DEP-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generate readable position code: POS-0001, POS-0002, etc.
 */
export async function generatePositionCode(db: NodePgDatabase<typeof schema>): Promise<string> {
  const result = await db.execute(sql`
    SELECT position_code 
    FROM positions 
    WHERE position_code ~ '^POS-[0-9]+$' 
    ORDER BY CAST(SUBSTRING(position_code FROM 5) AS INTEGER) DESC 
    LIMIT 1
  `);
  let nextNum = 1;
  if (result.rows.length > 0 && result.rows[0].position_code) {
    const lastCode = result.rows[0].position_code as string;
    const numPart = parseInt(lastCode.replace('POS-', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `POS-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generate readable employee number: EMP-0001, EMP-0002, etc.
 */
export async function generateEmployeeNo(db: NodePgDatabase<typeof schema>): Promise<string> {
  const result = await db.execute(sql`
    SELECT employee_no 
    FROM employees 
    WHERE employee_no ~ '^EMP-[0-9]+$' 
    ORDER BY CAST(SUBSTRING(employee_no FROM 5) AS INTEGER) DESC 
    LIMIT 1
  `);
  let nextNum = 1;
  if (result.rows.length > 0 && result.rows[0].employee_no) {
    const lastCode = result.rows[0].employee_no as string;
    const numPart = parseInt(lastCode.replace('EMP-', ''), 10);
    if (!isNaN(numPart)) nextNum = numPart + 1;
  }
  return `EMP-${String(nextNum).padStart(4, '0')}`;
}
