import { PrismaClient,
  type ChangeRequestPriority,
  type ChangeRequestStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { notifyApproversNewCr, resolveApproverNotifications } from '../src/lib/notifications.js';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'demo123';
const DAY = 86400000;

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY);
}

function computeSlaDue(from: Date, slaDays: number) {
  return new Date(from.getTime() + slaDays * DAY);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Reset transactional demo data (keeps org/user upserts fresh)
  await prisma.workflowLog.deleteMany();
  await prisma.crComment.deleteMany();
  await prisma.externalTicketLink.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.changeRequest.deleteMany();

  const admin = await prisma.user.upsert({
    where: { email: 'admin@swipetouch.local' },
    update: { passwordHash, role: 'ADMIN', isActive: true, fullName: 'System Admin' },
    create: {
      email: 'admin@swipetouch.local',
      passwordHash,
      role: 'ADMIN',
      fullName: 'System Admin',
    },
  });

  const approver = await prisma.user.upsert({
    where: { email: 'approver@swipetouch.local' },
    update: { passwordHash, role: 'APPROVER', isActive: true, fullName: 'Ravi Mehta' },
    create: {
      email: 'approver@swipetouch.local',
      passwordHash,
      role: 'APPROVER',
      fullName: 'Ravi Mehta',
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@swipetouch.local' },
    update: { passwordHash, role: 'CS_MEMBER', isActive: true, fullName: 'Priya Sharma' },
    create: {
      email: 'staff1@swipetouch.local',
      passwordHash,
      role: 'CS_MEMBER',
      fullName: 'Priya Sharma',
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'staff2@swipetouch.local' },
    update: { passwordHash, role: 'CS_MEMBER', isActive: true, fullName: 'Amit Kumar' },
    create: {
      email: 'staff2@swipetouch.local',
      passwordHash,
      role: 'CS_MEMBER',
      fullName: 'Amit Kumar',
    },
  });

  type OrgSeed = {
    code: string;
    name: string;
    city: string;
    address: string;
    contactPhone: string;
    contactEmail: string;
    primaryContactName: string;
    slaDays: number;
    raisers: { email: string; fullName: string }[];
  };

  const orgDefs: OrgSeed[] = [
    {
      code: 'demoschool',
      name: 'Demo Public School',
      city: 'Noida',
      address: '12 Knowledge Park, Sector 62',
      contactPhone: '+91 98765 43210',
      contactEmail: 'office@demopublic.edu.in',
      primaryContactName: 'Rajesh Verma',
      slaDays: 14,
      raisers: [
        { email: 'client@demoschool.local', fullName: 'Rajesh Verma' },
        { email: 'client2@demoschool.local', fullName: 'Anita Singh' },
      ],
    },
    {
      code: 'greenvalley',
      name: 'Green Valley International School',
      city: 'Bengaluru',
      address: '45 Bannerghatta Road',
      contactPhone: '+91 99887 76655',
      contactEmail: 'admin@greenvalley.edu.in',
      primaryContactName: 'Meera Iyer',
      slaDays: 10,
      raisers: [
        { email: 'admin@greenvalley.edu.in', fullName: 'Meera Iyer' },
        { email: 'it@greenvalley.edu.in', fullName: 'Karthik Nair' },
      ],
    },
    {
      code: 'stmarys',
      name: "St. Mary's College",
      city: 'Mumbai',
      address: '88 Hill Road, Bandra',
      contactPhone: '+91 91234 56780',
      contactEmail: 'principal@stmarys.edu.in',
      primaryContactName: 'Fr. Thomas George',
      slaDays: 21,
      raisers: [{ email: 'cr@stmarys.edu.in', fullName: 'Sister Maria Joseph' }],
    },
    {
      code: 'davcollege',
      name: 'DAV College of Management',
      city: 'Chandigarh',
      address: 'Sector 10-C, Madhya Marg',
      contactPhone: '+91 98760 11223',
      contactEmail: 'office@davcm.edu.in',
      primaryContactName: 'Dr. Sandeep Khurana',
      slaDays: 14,
      raisers: [
        { email: 'office@davcm.edu.in', fullName: 'Dr. Sandeep Khurana' },
        { email: 'registrar@davcm.edu.in', fullName: 'Pooja Bansal' },
      ],
    },
    {
      code: 'sunrise',
      name: 'Sunrise Academy',
      city: 'Pune',
      address: '22 FC Road, Shivajinagar',
      contactPhone: '+91 90123 45678',
      contactEmail: 'hello@sunriseacademy.in',
      primaryContactName: 'Vikram Deshpande',
      slaDays: 7,
      raisers: [{ email: 'hello@sunriseacademy.in', fullName: 'Vikram Deshpande' }],
    },
  ];

  const orgs: { id: string; code: string; slaDays: number; raiserIds: string[] }[] = [];

  for (const def of orgDefs) {
    const org = await prisma.organization.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        city: def.city,
        address: def.address,
        contactPhone: def.contactPhone,
        contactEmail: def.contactEmail,
        primaryContactName: def.primaryContactName,
        slaDays: def.slaDays,
        defaultApproverId: approver.id,
        status: 'active',
      },
      create: {
        name: def.name,
        code: def.code,
        segment: 'mid-market',
        country: 'India',
        city: def.city,
        address: def.address,
        contactPhone: def.contactPhone,
        contactEmail: def.contactEmail,
        primaryContactName: def.primaryContactName,
        slaDays: def.slaDays,
        defaultApproverId: approver.id,
      },
    });

    const raiserIds: string[] = [];
    for (const r of def.raisers) {
      const user = await prisma.user.upsert({
        where: { email: r.email },
        update: {
          passwordHash,
          role: 'CLIENT',
          organizationId: org.id,
          fullName: r.fullName,
          isDesignatedRaiser: true,
          isActive: true,
        },
        create: {
          email: r.email,
          passwordHash,
          role: 'CLIENT',
          organizationId: org.id,
          fullName: r.fullName,
          isDesignatedRaiser: true,
        },
      });
      raiserIds.push(user.id);
    }
    orgs.push({ id: org.id, code: def.code, slaDays: def.slaDays, raiserIds });
  }

  type CrSeed = {
    orgCode: string;
    title: string;
    description: string;
    moduleAffected: string;
    status: ChangeRequestStatus;
    priority: ChangeRequestPriority;
    daysAgoCreated: number;
    staffIndex?: 0 | 1;
    closedDaysAgo?: number;
    breached?: boolean;
  };

  const crDefs: CrSeed[] = [
    // Demo school — mix of statuses
    { orgCode: 'demoschool', title: 'Add custom report card layout', description: 'Term-wise report card with parent signature.', moduleAffected: 'Reports', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 2 },
    { orgCode: 'demoschool', title: 'Fee payment gateway integration', description: 'Razorpay integration with receipt PDF.', moduleAffected: 'Finance', status: 'IN_PROGRESS', priority: 'URGENT', daysAgoCreated: 16, staffIndex: 0, breached: true },
    { orgCode: 'demoschool', title: 'SMS alerts for attendance', description: 'Daily absence SMS to parents.', moduleAffected: 'Communication', status: 'APPROVED_ASSIGNED', priority: 'MEDIUM', daysAgoCreated: 5, staffIndex: 1 },
    { orgCode: 'demoschool', title: 'Library module barcode scan', description: 'Android scanner for book issue/return.', moduleAffected: 'Other', status: 'CLOSED', priority: 'LOW', daysAgoCreated: 45, staffIndex: 0, closedDaysAgo: 5 },
    { orgCode: 'demoschool', title: 'Timetable clash detection', description: 'Warn when teacher double-booked.', moduleAffected: 'Timetable', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 20, staffIndex: 1, closedDaysAgo: 2 },
    { orgCode: 'demoschool', title: 'Custom ID card template', description: 'New layout with QR code.', moduleAffected: 'Admissions', status: 'REJECTED', priority: 'LOW', daysAgoCreated: 30 },
    // Green Valley — highest volume client
    { orgCode: 'greenvalley', title: 'Parent app dark mode', description: 'Theme toggle in mobile portal.', moduleAffected: 'Communication', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 8, staffIndex: 0 },
    { orgCode: 'greenvalley', title: 'Bulk fee import from Excel', description: 'Validate and import 5k rows.', moduleAffected: 'Finance', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 1 },
    { orgCode: 'greenvalley', title: 'Exam seating plan generator', description: 'Auto-assign rooms by roll number.', moduleAffected: 'Examinations', status: 'CLOSED', priority: 'HIGH', daysAgoCreated: 55, staffIndex: 1, closedDaysAgo: 40 },
    { orgCode: 'greenvalley', title: 'Transport route optimizer', description: 'Reorder stops by distance.', moduleAffected: 'Other', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 25, staffIndex: 0, closedDaysAgo: 8 },
    { orgCode: 'greenvalley', title: 'Staff leave approval workflow', description: 'Multi-step approval chain.', moduleAffected: 'Attendance', status: 'RESOLVED', priority: 'MEDIUM', daysAgoCreated: 12, staffIndex: 1 },
    { orgCode: 'greenvalley', title: 'Report card GPA scale change', description: 'Switch to 10-point scale.', moduleAffected: 'Reports', status: 'CLOSED', priority: 'URGENT', daysAgoCreated: 90, staffIndex: 0, closedDaysAgo: 75 },
    // St Mary's
    { orgCode: 'stmarys', title: 'Alumni portal login', description: 'SSO for graduated students.', moduleAffected: 'Admissions', status: 'APPROVED_ASSIGNED', priority: 'LOW', daysAgoCreated: 4, staffIndex: 1 },
    { orgCode: 'stmarys', title: 'Hostel mess billing', description: 'Monthly mess charges on fee bill.', moduleAffected: 'Finance', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 18, staffIndex: 0, breached: true },
    { orgCode: 'stmarys', title: 'Certificate auto-generation', description: 'Bonafide and TC PDF templates.', moduleAffected: 'Reports', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 35, staffIndex: 1, closedDaysAgo: 15 },
    // DAV
    { orgCode: 'davcollege', title: 'Placement cell dashboard', description: 'Track company visits and offers.', moduleAffected: 'Other', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 3 },
    { orgCode: 'davcollege', title: 'Internship credit mapping', description: 'Map hours to course credits.', moduleAffected: 'Examinations', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgoCreated: 7, staffIndex: 0 },
    { orgCode: 'davcollege', title: 'Faculty appraisal forms', description: 'Online self-assessment module.', moduleAffected: 'Attendance', status: 'CLOSED', priority: 'LOW', daysAgoCreated: 60, staffIndex: 1, closedDaysAgo: 50 },
    // Sunrise — short SLA, several breaches
    { orgCode: 'sunrise', title: 'WhatsApp fee reminder', description: 'Template messages via API.', moduleAffected: 'Communication', status: 'IN_PROGRESS', priority: 'URGENT', daysAgoCreated: 10, staffIndex: 1, breached: true },
    { orgCode: 'sunrise', title: 'Admission form OCR', description: 'Scan Aadhaar into student profile.', moduleAffected: 'Admissions', status: 'PENDING_APPROVAL', priority: 'HIGH', daysAgoCreated: 0 },
    { orgCode: 'sunrise', title: 'Canteen wallet top-up', description: 'Prepaid balance for students.', moduleAffected: 'Finance', status: 'CLOSED', priority: 'MEDIUM', daysAgoCreated: 14, staffIndex: 0, closedDaysAgo: 3 },
  ];

  const staff = [staff1, staff2];

  for (const def of crDefs) {
    const org = orgs.find((o) => o.code === def.orgCode)!;
    const createdAt = daysAgo(def.daysAgoCreated);
    const requestedById = org.raiserIds[0];
    const assignedStaff = def.staffIndex !== undefined ? staff[def.staffIndex] : null;

    let slaDueAt = computeSlaDue(createdAt, org.slaDays);
    if (def.breached) {
      slaDueAt = daysAgo(2);
    }

    const closedAt = def.closedDaysAgo !== undefined ? daysAgo(def.closedDaysAgo) : null;
    const resolvedAt =
      def.status === 'RESOLVED' || def.status === 'CLOSED'
        ? closedAt ?? daysAgo(Math.max(1, def.daysAgoCreated - 3))
        : null;

    const cr = await prisma.changeRequest.create({
      data: {
        organizationId: org.id,
        requestedById,
        approverId: def.status !== 'PENDING_APPROVAL' ? approver.id : approver.id,
        assignedStaffId:
          assignedStaff && ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(def.status)
            ? assignedStaff.id
            : null,
        title: def.title,
        description: def.description,
        moduleAffected: def.moduleAffected,
        status: def.status,
        priority: def.priority,
        createdAt,
        slaDueAt,
        approvedAt: ['APPROVED_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(def.status)
          ? daysAgo(def.daysAgoCreated - 1)
          : null,
        assignedAt: assignedStaff ? daysAgo(def.daysAgoCreated - 1) : null,
        resolvedAt,
        closedAt: def.status === 'CLOSED' ? closedAt : null,
        rejectionReason: def.status === 'REJECTED' ? 'Deferred to next product cycle' : null,
      },
    });

    await prisma.workflowLog.create({
      data: {
        changeRequestId: cr.id,
        triggeredById: requestedById,
        previousStatus: null,
        newStatus: 'PENDING_APPROVAL',
        actionNote: 'Submitted',
        loggedAt: createdAt,
      },
    });

    if (def.status !== 'PENDING_APPROVAL' && def.status !== 'REJECTED') {
      await prisma.workflowLog.create({
        data: {
          changeRequestId: cr.id,
          triggeredById: approver.id,
          previousStatus: 'PENDING_APPROVAL',
          newStatus: 'APPROVED_ASSIGNED',
          loggedAt: daysAgo(def.daysAgoCreated - 1),
        },
      });
    }

    if (def.status === 'IN_PROGRESS' || def.status === 'RESOLVED' || def.status === 'CLOSED') {
      await prisma.workflowLog.create({
        data: {
          changeRequestId: cr.id,
          triggeredById: assignedStaff?.id ?? staff1.id,
          previousStatus: 'APPROVED_ASSIGNED',
          newStatus: 'IN_PROGRESS',
          loggedAt: daysAgo(def.daysAgoCreated - 1),
        },
      });
    }

    if (def.status === 'IN_PROGRESS' && def.orgCode === 'demoschool' && def.title.includes('Fee payment')) {
      await prisma.crComment.create({
        data: {
          changeRequestId: cr.id,
          authorId: staff1.id,
          content: 'JIRA SWP-1842 created. Payment adapter in QA.',
          visibility: 'CLIENT_VISIBLE',
        },
      });
      await prisma.externalTicketLink.create({
        data: {
          changeRequestId: cr.id,
          system: 'JIRA',
          externalId: 'SWP-1842',
          url: 'https://jira.example.com/browse/SWP-1842',
          linkedById: staff1.id,
        },
      });
    }
  }

  const allCrs = await prisma.changeRequest.findMany({
    select: { id: true, status: true, approverId: true },
  });
  for (const cr of allCrs) {
    await notifyApproversNewCr(cr.id);
    if (cr.status === 'REJECTED') {
      await resolveApproverNotifications(cr.id, 'REJECTED', cr.approverId ?? approver.id);
    } else if (cr.status !== 'PENDING_APPROVAL') {
      await resolveApproverNotifications(cr.id, 'APPROVED', cr.approverId ?? approver.id);
    }
  }

  const notifCount = await prisma.notification.count();
  const crCount = await prisma.changeRequest.count();
  const orgCount = await prisma.organization.count();

  console.log(`\nSeed complete: ${orgCount} institutions, ${crCount} change requests, ${notifCount} notifications`);
  console.log('Password for all accounts: demo123\n');
  console.log('Swipetouch internal:');
  console.log('  admin@swipetouch.local');
  console.log('  approver@swipetouch.local');
  console.log('  staff1@swipetouch.local, staff2@swipetouch.local');
  console.log('\nClient portals (org code / email):');
  for (const def of orgDefs) {
    console.log(`  ${def.code}: ${def.raisers.map((r) => r.email).join(', ')}`);
  }
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
