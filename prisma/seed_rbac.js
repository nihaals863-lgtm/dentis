const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: 'ADMIN', desc: 'Full system access' },
    { name: 'MANAGER', desc: 'Operational oversight' },
    { name: 'SECRETARY', desc: 'Administrative and booking' },
    { name: 'DENTIST', desc: 'Clinical operations' },
    { name: 'ASSISTANT', desc: 'Clinical support' },
    { name: 'ACCOUNTANT', desc: 'Financial auditing' }
  ];

  const modules = [
    'dashboard',
    'lab_cases',
    'laboratories',
    'vendors',
    'expenses',
    'payments',
    'schedule',
    'leaves',
    'employees',
    'financials',
    'reports',
    'reminders',
    'documents',
    'settings'
  ];

  console.log('Seeding Roles and Permissions...');

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { 
        name: r.name,
        description: r.desc
      }
    });

    for (const module of modules) {
      // Default permissions
      let perms = {
        canView: true,
        canCreate: r.name === 'ADMIN' || r.name === 'MANAGER',
        canUpdate: r.name === 'ADMIN' || r.name === 'MANAGER',
        canDelete: r.name === 'ADMIN' || r.name === 'MANAGER',
        canExport: r.name === 'ADMIN' || r.name === 'MANAGER'
      };

      // Customizations per role
      if (r.name === 'SECRETARY') {
         if (['dashboard', 'schedule', 'reminders', 'documents'].includes(module)) {
            perms.canCreate = perms.canUpdate = true;
         }
      } else if (r.name === 'DENTIST') {
         if (['lab_cases', 'schedule', 'documents', 'reminders'].includes(module)) {
            perms.canCreate = perms.canUpdate = true;
         }
      } else if (r.name === 'ACCOUNTANT') {
         if (['expenses', 'payments', 'financials', 'vendors'].includes(module)) {
            perms.canCreate = perms.canUpdate = perms.canExport = true;
         }
      }

      await prisma.permission.upsert({
        where: {
          roleId_module: {
            roleId: role.id,
            module: module
          }
        },
        update: perms,
        create: {
          roleId: role.id,
          module,
          ...perms
        }
      });
    }
    console.log(`- Role ${r.name} seeded with default permissions.`);
  }

  // Restore User Roles based on Employee jobTitle or name
  console.log('Restoring User-Role associations...');
  const users = await prisma.user.findMany({ include: { employee: true } });
  
  for (const user of users) {
    let roleToAssign = 'SECRETARY'; // Default

    if (user.employee) {
      const title = user.employee.jobTitle?.toUpperCase() || '';
      const email = user.email.toUpperCase();

      if (email.includes('ADMIN')) roleToAssign = 'ADMIN';
      else if (title.includes('DENTIST')) roleToAssign = 'DENTIST';
      else if (title.includes('MANAGER')) roleToAssign = 'MANAGER';
      else if (title.includes('ASSISTANT')) roleToAssign = 'ASSISTANT';
      else if (title.includes('ACCOUNTANT')) roleToAssign = 'ACCOUNTANT';
      else if (title.includes('SECRETARY')) roleToAssign = 'SECRETARY';
    }

    const role = await prisma.role.findUnique({ where: { name: roleToAssign } });
    if (role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: role.id }
      });
      console.log(`  User ${user.email} assigned to ${roleToAssign}`);
    }
  }

  console.log('RBAC Seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
