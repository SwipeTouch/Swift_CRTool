/**
 * Generates docs/sql/crms-full-import.sql — schema + demo data for server import.
 * Run: npm run sql:generate --workspace=@crms/api
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../../../docs/sql/crms-full-import.sql');

const PASSWORD_HASH = bcrypt.hashSync('demo123', 12);

function sqlStr(v: string | null | undefined) {
  if (v == null) return 'NULL';
  return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function daysAgoSql(n: number) {
  return n === 0 ? 'NOW()' : `DATE_SUB(NOW(), INTERVAL ${n} DAY)`;
}

function daysAgoPlusSql(daysAgo: number, plus: number) {
  const total = Math.max(0, daysAgo - plus);
  return total === 0 ? 'NOW()' : `DATE_SUB(NOW(), INTERVAL ${total} DAY)`;
}

/** Deterministic UUIDs for reproducible imports */
const IDS = {
  admin: '11111111-1111-4111-8111-111111111101',
  approver: '11111111-1111-4111-8111-111111111102',
  staff1: '11111111-1111-4111-8111-111111111103',
  staff2: '11111111-1111-4111-8111-111111111104',
  orgs: {
    demoschool: '22222222-2222-4222-8222-222222222201',
    greenvalley: '22222222-2222-4222-8222-222222222202',
    stmarys: '22222222-2222-4222-8222-222222222203',
    davcollege: '22222222-2222-4222-8222-222222222204',
    sunrise: '22222222-2222-4222-8222-222222222205',
  },
  clients: {
    'client@demoschool.local': '33333333-3333-4333-8333-333333333301',
    'client2@demoschool.local': '33333333-3333-4333-8333-333333333302',
    'admin@greenvalley.edu.in': '33333333-3333-4333-8333-333333333303',
    'it@greenvalley.edu.in': '33333333-3333-4333-8333-333333333304',
    'cr@stmarys.edu.in': '33333333-3333-4333-8333-333333333305',
    'office@davcm.edu.in': '33333333-3333-4333-8333-333333333306',
    'registrar@davcm.edu.in': '33333333-3333-4333-8333-333333333307',
    'hello@sunriseacademy.in': '33333333-3333-4333-8333-333333333308',
  },
};

function crId(n: number) {
  return `44444444-4444-4444-8444-${String(n).padStart(12, '0')}`;
}
function wfId(n: number) {
  return `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;
}
function notifId(n: number) {
  return `66666666-6666-4666-8666-${String(n).padStart(12, '0')}`;
}

const orgDefs = [
  { code: 'demoschool' as const, name: 'Demo Public School', city: 'Noida', address: '12 Knowledge Park, Sector 62', contactPhone: '+91 98765 43210', contactEmail: 'office@demopublic.edu.in', primaryContactName: 'Rajesh Verma', slaDays: 14, raisers: [{ email: 'client@demoschool.local', fullName: 'Rajesh Verma' }, { email: 'client2@demoschool.local', fullName: 'Anita Singh' }] },
  { code: 'greenvalley' as const, name: 'Green Valley International School', city: 'Bengaluru', address: '45 Bannerghatta Road', contactPhone: '+91 99887 76655', contactEmail: 'admin@greenvalley.edu.in', primaryContactName: 'Meera Iyer', slaDays: 10, raisers: [{ email: 'admin@greenvalley.edu.in', fullName: 'Meera Iyer' }, { email: 'it@greenvalley.edu.in', fullName: 'Karthik Nair' }] },
  { code: 'stmarys' as const, name: "St. Mary's College", city: 'Mumbai', address: '88 Hill Road, Bandra', contactPhone: '+91 91234 56780', contactEmail: 'principal@stmarys.edu.in', primaryContactName: 'Fr. Thomas George', slaDays: 21, raisers: [{ email: 'cr@stmarys.edu.in', fullName: 'Sister Maria Joseph' }] },
  { code: 'davcollege' as const, name: 'DAV College of Management', city: 'Chandigarh', address: 'Sector 10-C, Madhya Marg', contactPhone: '+91 98760 11223', contactEmail: 'office@davcm.edu.in', primaryContactName: 'Dr. Sandeep Khurana', slaDays: 14, raisers: [{ email: 'office@davcm.edu.in', fullName: 'Dr. Sandeep Khurana' }, { email: 'registrar@davcm.edu.in', fullName: 'Pooja Bansal' }] },
  { code: 'sunrise' as const, name: 'Sunrise Academy', city: 'Pune', address: '22 FC Road, Shivajinagar', contactPhone: '+91 90123 45678', contactEmail: 'hello@sunriseacademy.in', primaryContactName: 'Vikram Deshpande', slaDays: 7, raisers: [{ email: 'hello@sunriseacademy.in', fullName: 'Vikram Deshpande' }] },
];

type CrDef = {
  orgCode: keyof typeof IDS.orgs;
  title: string;
  description: string;
  moduleAffected: string;
  status: string;
  priority: string;
  daysAgoCreated: number;
  staffIndex?: 0 | 1;
  closedDaysAgo?: number;
  breached?: boolean;
};

const crDefs: CrDef[] = [
  { orgCode: 'demoschool', title: 'Add custom report card layout', description: 'Term-wise report card with parent signature.', moduleAffected: 'Reports', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 2 },
  { orgCode: 'demoschool', title: 'Fee payment gateway integration', description: 'Razorpay integration with receipt PDF.', moduleAffected: 'Finance', status: 'IN_PROGRESS', priority: 'URGENT', daysAgoCreated: 16, staffIndex: 0, breached: true },
  { orgCode: 'demoschool', title: 'SMS alerts for attendance', description: 'Daily absence SMS to parents.', moduleAffected: 'Communication', status: 'APPROVED_ASSIGNED', priority: 'MEDIUM', daysAgoCreated: 5, staffIndex: 1 },
  { orgCode: 'demoschool', title: 'Library module barcode scan', description: 'Android scanner for book issue/return.', moduleAffected: 'Other', status: 'CLOSED', priority: 'LOW', daysAgoCreated: 45, staffIndex: 0, closedDaysAgo: 5 },
  { orgCode: 'demoschool', title: 'Timetable clash detection', description: 'Warn when teacher double-booked.', moduleAffected: 'Timetable', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 20, staffIndex: 1, closedDaysAgo: 2 },
  { orgCode: 'demoschool', title: 'Custom ID card template', description: 'New layout with QR code.', moduleAffected: 'Admissions', status: 'REJECTED', priority: 'LOW', daysAgoCreated: 30 },
  { orgCode: 'greenvalley', title: 'Parent app dark mode', description: 'Theme toggle in mobile portal.', moduleAffected: 'Communication', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 8, staffIndex: 0 },
  { orgCode: 'greenvalley', title: 'Bulk fee import from Excel', description: 'Validate and import 5k rows.', moduleAffected: 'Finance', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 1 },
  { orgCode: 'greenvalley', title: 'Exam seating plan generator', description: 'Auto-assign rooms by roll number.', moduleAffected: 'Examinations', status: 'CLOSED', priority: 'HIGH', daysAgoCreated: 55, staffIndex: 1, closedDaysAgo: 40 },
  { orgCode: 'greenvalley', title: 'Transport route optimizer', description: 'Reorder stops by distance.', moduleAffected: 'Other', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 25, staffIndex: 0, closedDaysAgo: 8 },
  { orgCode: 'greenvalley', title: 'Staff leave approval workflow', description: 'Multi-step approval chain.', moduleAffected: 'Attendance', status: 'RESOLVED', priority: 'MEDIUM', daysAgoCreated: 12, staffIndex: 1 },
  { orgCode: 'greenvalley', title: 'Report card GPA scale change', description: 'Switch to 10-point scale.', moduleAffected: 'Reports', status: 'CLOSED', priority: 'URGENT', daysAgoCreated: 90, staffIndex: 0, closedDaysAgo: 75 },
  { orgCode: 'stmarys', title: 'Alumni portal login', description: 'SSO for graduated students.', moduleAffected: 'Admissions', status: 'APPROVED_ASSIGNED', priority: 'LOW', daysAgoCreated: 4, staffIndex: 1 },
  { orgCode: 'stmarys', title: 'Hostel mess billing', description: 'Monthly mess charges on fee bill.', moduleAffected: 'Finance', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 18, staffIndex: 0, breached: true },
  { orgCode: 'stmarys', title: 'Certificate auto-generation', description: 'Bonafide and TC PDF templates.', moduleAffected: 'Reports', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 35, staffIndex: 1, closedDaysAgo: 15 },
  { orgCode: 'davcollege', title: 'Placement cell dashboard', description: 'Track company visits and offers.', moduleAffected: 'Other', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 3 },
  { orgCode: 'davcollege', title: 'Internship credit mapping', description: 'Map hours to course credits.', moduleAffected: 'Examinations', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 7, staffIndex: 0 },
  { orgCode: 'davcollege', title: 'Faculty appraisal forms', description: 'Online self-assessment module.', moduleAffected: 'Attendance', status: 'CLOSED', priority: 'LOW', daysAgoCreated: 60, staffIndex: 1, closedDaysAgo: 50 },
  { orgCode: 'sunrise', title: 'WhatsApp fee reminder', description: 'Template messages via API.', moduleAffected: 'Communication', status: 'IN_PROGRESS', priority: 'URGENT', daysAgoCreated: 10, staffIndex: 1, breached: true },
  { orgCode: 'sunrise', title: 'Admission form OCR', description: 'Scan Aadhaar into student profile.', moduleAffected: 'Admissions', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 0 },
  { orgCode: 'sunrise', title: 'Canteen wallet top-up', description: 'Prepaid balance for students.', moduleAffected: 'Finance', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 14, staffIndex: 0, closedDaysAgo: 3 },
];

const staffIds = [IDS.staff1, IDS.staff2];
const raiserIdsByOrg: Record<string, string[]> = {};
for (const o of orgDefs) {
  raiserIdsByOrg[o.code] = o.raisers.map((r) => IDS.clients[r.email as keyof typeof IDS.clients]);
}

const lines: string[] = [];

lines.push(`-- =============================================================================
-- Swipetouch CRMS — Full MySQL import (schema + demo data)
-- Generated by: npm run sql:generate --workspace=@crms/api
--
-- Import:
--   mysql -u root -p < docs/sql/crms-full-import.sql
--   OR upload via phpMyAdmin / Adminer / Plesk
--
-- Demo password for ALL accounts: demo123
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS \`crms\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE \`crms\`;

DROP TABLE IF EXISTS \`notifications\`;
DROP TABLE IF EXISTS \`external_ticket_links\`;
DROP TABLE IF EXISTS \`cr_comments\`;
DROP TABLE IF EXISTS \`workflow_logs\`;
DROP TABLE IF EXISTS \`change_requests\`;
DROP TABLE IF EXISTS \`system_users\`;
DROP TABLE IF EXISTS \`organizations\`;

CREATE TABLE \`organizations\` (
  \`id\` CHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`code\` VARCHAR(50) NOT NULL,
  \`segment\` VARCHAR(50) NOT NULL DEFAULT 'mid-market',
  \`country\` VARCHAR(100) NOT NULL DEFAULT 'India',
  \`city\` VARCHAR(100) NULL,
  \`address\` TEXT NULL,
  \`contact_phone\` VARCHAR(30) NULL,
  \`contact_email\` VARCHAR(255) NULL,
  \`primary_contact_name\` VARCHAR(150) NULL,
  \`sla_days\` INT NOT NULL DEFAULT 14,
  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  \`default_approver_id\` CHAR(36) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`organizations_code_key\` (\`code\`),
  KEY \`organizations_status_idx\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`system_users\` (
  \`id\` CHAR(36) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('CLIENT', 'APPROVER', 'CS_MEMBER', 'ADMIN') NOT NULL,
  \`organization_id\` CHAR(36) NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`is_designated_raiser\` TINYINT(1) NOT NULL DEFAULT 0,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`system_users_email_key\` (\`email\`),
  KEY \`system_users_organization_id_idx\` (\`organization_id\`),
  KEY \`system_users_role_is_active_idx\` (\`role\`, \`is_active\`),
  CONSTRAINT \`system_users_organization_id_fkey\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE \`organizations\`
  ADD CONSTRAINT \`organizations_default_approver_id_fkey\`
  FOREIGN KEY (\`default_approver_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE \`change_requests\` (
  \`id\` CHAR(36) NOT NULL,
  \`organization_id\` CHAR(36) NOT NULL,
  \`requested_by_id\` CHAR(36) NOT NULL,
  \`approver_id\` CHAR(36) NULL,
  \`assigned_staff_id\` CHAR(36) NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`module_affected\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('PENDING_APPROVAL', 'APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  \`priority\` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  \`rejection_reason\` TEXT NULL,
  \`approved_at\` DATETIME(3) NULL,
  \`assigned_at\` DATETIME(3) NULL,
  \`resolved_at\` DATETIME(3) NULL,
  \`closed_at\` DATETIME(3) NULL,
  \`sla_due_at\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`change_requests_organization_id_created_at_idx\` (\`organization_id\`, \`created_at\`),
  KEY \`change_requests_status_idx\` (\`status\`),
  KEY \`change_requests_assigned_staff_id_status_idx\` (\`assigned_staff_id\`, \`status\`),
  CONSTRAINT \`change_requests_organization_id_fkey\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`change_requests_requested_by_id_fkey\` FOREIGN KEY (\`requested_by_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT \`change_requests_approver_id_fkey\` FOREIGN KEY (\`approver_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`change_requests_assigned_staff_id_fkey\` FOREIGN KEY (\`assigned_staff_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`workflow_logs\` (
  \`id\` CHAR(36) NOT NULL,
  \`change_request_id\` CHAR(36) NOT NULL,
  \`triggered_by_id\` CHAR(36) NOT NULL,
  \`previous_status\` VARCHAR(50) NULL,
  \`new_status\` VARCHAR(50) NOT NULL,
  \`action_note\` TEXT NULL,
  \`logged_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`workflow_logs_change_request_id_logged_at_idx\` (\`change_request_id\`, \`logged_at\`),
  CONSTRAINT \`workflow_logs_change_request_id_fkey\` FOREIGN KEY (\`change_request_id\`) REFERENCES \`change_requests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`workflow_logs_triggered_by_id_fkey\` FOREIGN KEY (\`triggered_by_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`cr_comments\` (
  \`id\` CHAR(36) NOT NULL,
  \`change_request_id\` CHAR(36) NOT NULL,
  \`author_id\` CHAR(36) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`visibility\` ENUM('INTERNAL', 'CLIENT_VISIBLE') NOT NULL DEFAULT 'INTERNAL',
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`cr_comments_change_request_id_created_at_idx\` (\`change_request_id\`, \`created_at\`),
  CONSTRAINT \`cr_comments_change_request_id_fkey\` FOREIGN KEY (\`change_request_id\`) REFERENCES \`change_requests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`cr_comments_author_id_fkey\` FOREIGN KEY (\`author_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`external_ticket_links\` (
  \`id\` CHAR(36) NOT NULL,
  \`change_request_id\` CHAR(36) NOT NULL,
  \`system\` ENUM('JIRA', 'OSTICKET', 'OTHER') NOT NULL,
  \`external_id\` VARCHAR(100) NOT NULL,
  \`url\` VARCHAR(500) NULL,
  \`linked_by_id\` CHAR(36) NOT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`external_ticket_links_change_request_id_idx\` (\`change_request_id\`),
  CONSTRAINT \`external_ticket_links_change_request_id_fkey\` FOREIGN KEY (\`change_request_id\`) REFERENCES \`change_requests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`notifications\` (
  \`id\` CHAR(36) NOT NULL,
  \`user_id\` CHAR(36) NOT NULL,
  \`change_request_id\` CHAR(36) NOT NULL,
  \`status\` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED_FOR_REASSIGN', 'ASSIGNED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
  \`acted_by_id\` CHAR(36) NULL,
  \`acted_at\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`notifications_user_id_change_request_id_key\` (\`user_id\`, \`change_request_id\`),
  KEY \`notifications_user_id_status_is_read_idx\` (\`user_id\`, \`status\`, \`is_read\`),
  KEY \`notifications_change_request_id_idx\` (\`change_request_id\`),
  CONSTRAINT \`notifications_user_id_fkey\` FOREIGN KEY (\`user_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`notifications_change_request_id_fkey\` FOREIGN KEY (\`change_request_id\`) REFERENCES \`change_requests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`notifications_acted_by_id_fkey\` FOREIGN KEY (\`acted_by_id\`) REFERENCES \`system_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================== DEMO DATA =====================

-- Internal users (insert before org default_approver FK is populated)
INSERT INTO \`system_users\` (\`id\`, \`email\`, \`password_hash\`, \`role\`, \`organization_id\`, \`full_name\`, \`is_designated_raiser\`, \`is_active\`) VALUES
  (${sqlStr(IDS.admin)}, ${sqlStr('admin@swipetouch.local')}, ${sqlStr(PASSWORD_HASH)}, 'ADMIN', NULL, ${sqlStr('System Admin')}, 0, 1),
  (${sqlStr(IDS.approver)}, ${sqlStr('approver@swipetouch.local')}, ${sqlStr(PASSWORD_HASH)}, 'APPROVER', NULL, ${sqlStr('Ravi Mehta')}, 0, 1),
  (${sqlStr(IDS.staff1)}, ${sqlStr('staff1@swipetouch.local')}, ${sqlStr(PASSWORD_HASH)}, 'CS_MEMBER', NULL, ${sqlStr('Priya Sharma')}, 0, 1),
  (${sqlStr(IDS.staff2)}, ${sqlStr('staff2@swipetouch.local')}, ${sqlStr(PASSWORD_HASH)}, 'CS_MEMBER', NULL, ${sqlStr('Amit Kumar')}, 0, 1);
`);

// Organizations
lines.push('INSERT INTO `organizations` (`id`, `name`, `code`, `segment`, `country`, `city`, `address`, `contact_phone`, `contact_email`, `primary_contact_name`, `sla_days`, `status`, `default_approver_id`) VALUES');
orgDefs.forEach((o, i) => {
  lines.push(
    `  (${sqlStr(IDS.orgs[o.code])}, ${sqlStr(o.name)}, ${sqlStr(o.code)}, 'mid-market', 'India', ${sqlStr(o.city)}, ${sqlStr(o.address)}, ${sqlStr(o.contactPhone)}, ${sqlStr(o.contactEmail)}, ${sqlStr(o.primaryContactName)}, ${o.slaDays}, 'active', ${sqlStr(IDS.approver)})${i < orgDefs.length - 1 ? ',' : ';'}`,
  );
});

// Clients
lines.push('INSERT INTO `system_users` (`id`, `email`, `password_hash`, `role`, `organization_id`, `full_name`, `is_designated_raiser`, `is_active`) VALUES');
const clientRows: string[] = [];
for (const o of orgDefs) {
  for (const r of o.raisers) {
    const cid = IDS.clients[r.email as keyof typeof IDS.clients];
    clientRows.push(
      `  (${sqlStr(cid)}, ${sqlStr(r.email)}, ${sqlStr(PASSWORD_HASH)}, 'CLIENT', ${sqlStr(IDS.orgs[o.code])}, ${sqlStr(r.fullName)}, 1, 1)`,
    );
  }
}
lines.push(clientRows.join(',\n') + ';');

// Change requests
lines.push('INSERT INTO `change_requests` (`id`, `organization_id`, `requested_by_id`, `approver_id`, `assigned_staff_id`, `title`, `description`, `module_affected`, `status`, `priority`, `rejection_reason`, `approved_at`, `assigned_at`, `resolved_at`, `closed_at`, `sla_due_at`, `created_at`, `updated_at`) VALUES');

const crMeta: { id: string; status: string }[] = [];

crDefs.forEach((def, i) => {
  const id = crId(i + 1);
  crMeta.push({ id, status: def.status });
  const org = orgDefs.find((o) => o.code === def.orgCode)!;
  const requestedById = raiserIdsByOrg[def.orgCode][0];
  const assignedStaff = def.staffIndex !== undefined ? staffIds[def.staffIndex] : null;
  const hasAssign = assignedStaff && ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(def.status);
  const created = daysAgoSql(def.daysAgoCreated);
  const slaDue = def.breached ? daysAgoSql(2) : `DATE_ADD(${daysAgoSql(def.daysAgoCreated)}, INTERVAL ${org.slaDays} DAY)`;
  const approved = ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(def.status) ? daysAgoPlusSql(def.daysAgoCreated, 1) : 'NULL';
  const assigned = hasAssign ? daysAgoPlusSql(def.daysAgoCreated, 1) : 'NULL';
  const closedAt = def.closedDaysAgo !== undefined ? daysAgoSql(def.closedDaysAgo) : 'NULL';
  const resolved = def.status === 'RESOLVED' || def.status === 'CLOSED' ? (def.closedDaysAgo !== undefined ? daysAgoSql(def.closedDaysAgo) : daysAgoPlusSql(def.daysAgoCreated, 3)) : 'NULL';
  const rejection = def.status === 'REJECTED' ? sqlStr('Deferred to next product cycle') : 'NULL';

  lines.push(
    `  (${sqlStr(id)}, ${sqlStr(IDS.orgs[def.orgCode])}, ${sqlStr(requestedById)}, ${sqlStr(IDS.approver)}, ${hasAssign ? sqlStr(assignedStaff!) : 'NULL'}, ${sqlStr(def.title)}, ${sqlStr(def.description)}, ${sqlStr(def.moduleAffected)}, '${def.status}', '${def.priority}', ${rejection}, ${approved}, ${assigned}, ${resolved}, ${def.status === 'CLOSED' ? closedAt : 'NULL'}, ${slaDue}, ${created}, ${created})${i < crDefs.length - 1 ? ',' : ';'}`,
  );
});

// Workflow logs
const wfLines: string[] = [];
let wfN = 1;
crDefs.forEach((def, i) => {
  const cr = crId(i + 1);
  const requestedById = raiserIdsByOrg[def.orgCode][0];
  const assignedStaff = def.staffIndex !== undefined ? staffIds[def.staffIndex] : null;
  wfLines.push(`  (${sqlStr(wfId(wfN++))}, ${sqlStr(cr)}, ${sqlStr(requestedById)}, NULL, 'PENDING_APPROVAL', 'Submitted', ${daysAgoSql(def.daysAgoCreated)})`);
  if (def.status !== 'PENDING_APPROVAL' && def.status !== 'REJECTED') {
    wfLines.push(`  (${sqlStr(wfId(wfN++))}, ${sqlStr(cr)}, ${sqlStr(IDS.approver)}, 'PENDING_APPROVAL', 'APPROVED_ASSIGNED', NULL, ${daysAgoPlusSql(def.daysAgoCreated, 1)})`);
  }
  if (['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(def.status)) {
    wfLines.push(`  (${sqlStr(wfId(wfN++))}, ${sqlStr(cr)}, ${sqlStr(assignedStaff ?? IDS.staff1)}, 'APPROVED_ASSIGNED', 'IN_PROGRESS', NULL, ${daysAgoPlusSql(def.daysAgoCreated, 1)})`);
  }
});
lines.push('INSERT INTO `workflow_logs` (`id`, `change_request_id`, `triggered_by_id`, `previous_status`, `new_status`, `action_note`, `logged_at`) VALUES');
lines.push(wfLines.join(',\n') + ';');

// Fee payment comment + JIRA
const feeIdx = crDefs.findIndex((c) => c.orgCode === 'demoschool' && c.title.includes('Fee payment'));
if (feeIdx >= 0) {
  const feeCr = crId(feeIdx + 1);
  lines.push(`INSERT INTO \`cr_comments\` (\`id\`, \`change_request_id\`, \`author_id\`, \`content\`, \`visibility\`) VALUES`);
  lines.push(`  ('77777777-7777-4777-8777-777777777701', ${sqlStr(feeCr)}, ${sqlStr(IDS.staff1)}, 'JIRA SWP-1842 created. Payment adapter in QA.', 'CLIENT_VISIBLE');`);
  lines.push(`INSERT INTO \`external_ticket_links\` (\`id\`, \`change_request_id\`, \`system\`, \`external_id\`, \`url\`, \`linked_by_id\`) VALUES`);
  lines.push(`  ('77777777-7777-4777-8777-777777777702', ${sqlStr(feeCr)}, 'JIRA', 'SWP-1842', 'https://jira.example.com/browse/SWP-1842', ${sqlStr(IDS.staff1)});`);
}

// Notifications
const notifLines: string[] = [];
let notifN = 1;
for (const cr of crMeta) {
  for (const uid of [IDS.admin, IDS.approver]) {
    let status = 'PENDING_APPROVAL';
    let actedBy: string | null = null;
    let actedAt = 'NULL';
    if (cr.status === 'REJECTED') {
      status = 'REJECTED';
      actedBy = IDS.approver;
      actedAt = 'NOW()';
    } else if (cr.status !== 'PENDING_APPROVAL') {
      status = 'APPROVED';
      actedBy = IDS.approver;
      actedAt = 'NOW()';
    }
    notifLines.push(
      `  (${sqlStr(notifId(notifN++))}, ${sqlStr(uid)}, ${sqlStr(cr.id)}, '${status}', 0, ${actedBy ? sqlStr(actedBy) : 'NULL'}, ${actedAt})`,
    );
  }
}
lines.push('INSERT INTO `notifications` (`id`, `user_id`, `change_request_id`, `status`, `is_read`, `acted_by_id`, `acted_at`) VALUES');
lines.push(notifLines.join(',\n') + ';');

lines.push(`
SET FOREIGN_KEY_CHECKS = 1;

-- ===================== DEMO ACCOUNTS (password: demo123) =====================
-- Internal: admin@swipetouch.local | approver@swipetouch.local | staff1@swipetouch.local | staff2@swipetouch.local
-- Client org codes: demoschool | greenvalley | stmarys | davcollege | sunrise
-- Sample client: client@demoschool.local + org code demoschool
-- Data: 5 institutions, 21 change requests, 42 notifications
`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Written: ${OUT}`);
