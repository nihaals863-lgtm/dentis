const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllVendors = async () => {
  return await prisma.vendor.findMany({
    include: { documents: true },
  });
};

const getVendorById = async (id) => {
  return await prisma.vendor.findUnique({
    where: { id: parseInt(id) },
  });
};

const createVendor = async (vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount } = vendorData;
  return await prisma.vendor.create({
    data: {
      name,
      contactName: contactPerson,
      categories: Array.isArray(categories) ? categories.join(',') : categories,
      phone,
      email,
      address,
      notes,
      taxId,
      bankName,
      bankAccount
    },
  });
};

const updateVendor = async (id, vendorData) => {
  const { name, contactPerson, categories, phone, email, address, notes, taxId, bankName, bankAccount } = vendorData;
  return await prisma.vendor.update({
    where: { id: parseInt(id) },
    data: {
      name,
      contactName: contactPerson,
      categories: Array.isArray(categories) ? categories.join(',') : categories,
      phone,
      email,
      address,
      notes,
      taxId,
      bankName,
      bankAccount
    },
  });
};

const deleteVendor = async (id) => {
  return await prisma.vendor.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
};
