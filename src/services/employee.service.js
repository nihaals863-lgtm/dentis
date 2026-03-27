const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utils/password.utils');
const prisma = new PrismaClient();

const getAllEmployees = async () => {
  const employees = await prisma.employee.findMany({
    include: { 
      user: { 
        include: { role: true }
      } 
    },
  });
  return employees.map(emp => ({
    ...emp,
    user: emp.user ? {
      ...emp.user,
      role: emp.user.role?.name || 'SECRETARY'
    } : null
  }));
};

const getEmployeeById = async (id) => {
  const emp = await prisma.employee.findUnique({
    where: { id: parseInt(id) },
    include: { 
      user: { 
        include: { role: true }
      } 
    },
  });
  if (!emp) return null;
  return {
    ...emp,
    user: emp.user ? {
      ...emp.user,
      role: emp.user.role?.name || 'SECRETARY'
    } : null
  };
};

const createEmployee = async (employeeData) => {
  const { 
    email, password, role, 
    firstName, lastName, phone, dateOfBirth, gender, address, 
    nationalId, profileImageUrl, jobTitle, specialization, licenseNumber, 
    licenseExpiry, visaExpiry, workPermitExpiry,
    employmentType, status, joiningDate, basicSalary, notes
  } = employeeData;

  const hashedPassword = await hashPassword(password || 'Dental@123');

  return await prisma.$transaction(async (tx) => {
    const roleRecord = await tx.role.findUnique({ where: { name: role || 'ASSISTANT' } });
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        roleId: roleRecord?.id,
      },
    });

    return await tx.employee.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        nationalId,
        profileImageUrl,
        jobTitle,
        specialization,
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        visaExpiry: visaExpiry ? new Date(visaExpiry) : null,
        workPermitExpiry: workPermitExpiry ? new Date(workPermitExpiry) : null,
        employmentType,
        status,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        basicSalary: parseFloat(basicSalary || 0),
        notes,
      },
      include: { user: true },
    });
  });
};

const updateEmployee = async (id, employeeData) => {
  const { 
    email, role, isActive,
    firstName, lastName, phone, dateOfBirth, gender, address, 
    nationalId, profileImageUrl, jobTitle, specialization, licenseNumber, 
    licenseExpiry, visaExpiry, workPermitExpiry,
    employmentType, status, joiningDate, basicSalary, notes
  } = employeeData;

  return await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: parseInt(id) } });
    if (!employee) throw new Error('Employee not found');

    if (email || role || isActive !== undefined) {
        const updateData = {
          ...(email && { email }),
          ...(isActive !== undefined && { isActive }),
        };
        if (role) {
          const roleRecord = await tx.role.findUnique({ where: { name: role } });
          if (roleRecord) updateData.roleId = roleRecord.id;
        }
        await tx.user.update({
          where: { id: employee.userId },
          data: updateData,
        });
    }

    return await tx.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(address && { address }),
        ...(nationalId && { nationalId }),
        ...(profileImageUrl && { profileImageUrl }),
        ...(jobTitle && { jobTitle }),
        ...(specialization && { specialization }),
        ...(licenseNumber && { licenseNumber }),
        ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
        ...(visaExpiry && { visaExpiry: new Date(visaExpiry) }),
        ...(workPermitExpiry && { workPermitExpiry: new Date(workPermitExpiry) }),
        ...(employmentType && { employmentType }),
        ...(status && { status }),
        ...(joiningDate && { joiningDate: new Date(joiningDate) }),
        ...(basicSalary && { basicSalary: parseFloat(basicSalary) }),
        ...(notes && { notes }),
      },
      include: { user: true },
    });
  });
};

const deleteEmployee = async (id) => {
  const employee = await prisma.employee.findUnique({ where: { id: parseInt(id) } });
  if (!employee) throw new Error('Employee not found');
  
  // prisma schema has onDelete: Cascade for user -> employee relation
  return await prisma.user.delete({
    where: { id: employee.userId },
  });
};

const getDentists = async () => {
    const dentists = await prisma.employee.findMany({
        where: {
            user: { role: { name: 'DENTIST' } }
        },
        include: { user: { include: { role: true } } }
    });
    return dentists.map(emp => ({
      ...emp,
      user: emp.user ? {
        ...emp.user,
        role: emp.user.role?.name || 'DENTIST'
      } : null
    }));
};

const importEmployees = async (employeesArray) => {
  const results = [];
  for (const emp of employeesArray) {
    try {
      // Map incoming fields to what createEmployee expects
      const formatted = {
        email: emp.email || emp.Email,
        password: emp.password || 'Dental@123',
        role: (emp.role || emp.Role || 'ASSISTANT').toUpperCase(),
        firstName: emp.firstName || emp.firstName || (emp.name || emp.Name || 'Unknown').split(' ')[0],
        lastName: emp.lastName || (emp.name || emp.Name || 'Unknown').split(' ').slice(1).join(' ') || '.',
        phone: emp.phone || emp.Phone,
        jobTitle: emp.jobTitle || emp["Job Title"] || emp.Job || "Staff",
        nationalId: emp.idNumber || emp["ID Number"] || emp.ID || `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        joiningDate: emp.startDate || emp["Start Date"] || new Date(),
        licenseExpiry: emp.licenseExpiry === 'N/A' ? null : emp.licenseExpiry,
        visaExpiry: emp.visaExpiry === 'N/A' ? null : emp.visaExpiry,
        workPermitExpiry: emp.workPermitExpiry === 'N/A' ? null : emp.workPermitExpiry,
        status: 'ACTIVE',
        employmentType: 'FULL_TIME'
      };

      // Check if user already exists to avoid duplicate errors
      const existingUser = await prisma.user.findUnique({ where: { email: formatted.email } });
      if (existingUser) continue;

      const result = await createEmployee(formatted);
      results.push(result);
    } catch (err) {
      console.error(`Failed to import employee:`, err.message);
    }
  }
  return { count: results.length };
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDentists,
  importEmployees
};
