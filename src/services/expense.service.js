const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllExpenses = async () => {
  return await prisma.expense.findMany({
    include: { vendor: true, payments: true, documents: true },
  });
};

const getExpenseById = async (id) => {
  return await prisma.expense.findUnique({
    where: { id: parseInt(id) },
    include: { vendor: true, payments: true, documents: true },
  });
};

const createExpense = async (expenseData) => {
  const { vendorId, category, branch, ...data } = expenseData;
  
  // Validate vendor belongs to category
  const vendor = await prisma.vendor.findUnique({ where: { id: parseInt(vendorId) } });
  if (!vendor || !vendor.categories || !vendor.categories.split(',').includes(category)) {
    throw new Error('Selected vendor does not belong to the selected category');
  }

  return await prisma.expense.create({
    data: {
      ...data,
      category,
      branch,
      vendor: { connect: { id: parseInt(vendorId) } },
      status: 'PENDING',
      paymentStatus: 'PENDING'
    },
  });
};

const updateExpense = async (id, expenseData) => {
  const { vendorId, category, branch, ...data } = expenseData;
  const updateData = { ...data };
  
  if (category) updateData.category = category;
  if (branch) updateData.branch = branch;

  if (vendorId) {
    // Validate vendor belongs to category
    const currentExpense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    const targetCategory = category || currentExpense.category;
    const vendor = await prisma.vendor.findUnique({ where: { id: parseInt(vendorId) } });
    
    if (!vendor || !vendor.categories || !vendor.categories.split(',').includes(targetCategory)) {
      throw new Error('Selected vendor does not belong to the selected category');
    }
    updateData.vendor = { connect: { id: parseInt(vendorId) } };
  }

  return await prisma.expense.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const processBatchPayment = async (payload) => {
  const { expenseIds, amount, method, notes } = payload;
  const count = expenseIds.length;
  if (count === 0) return;

  const amountPerExpense = parseFloat(amount) / count;

  const results = await Promise.all(expenseIds.map(async (id) => {
    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!expense) return null;

    const newAmountPaid = parseFloat(expense.amountPaid) + amountPerExpense;
    const totalAmount = parseFloat(expense.amount);
    
    let paymentStatus = 'PARTIAL';
    let status = 'PENDING';

    if (newAmountPaid >= totalAmount) {
      paymentStatus = 'PAID';
      status = 'PAID';
    }

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        paymentType: 'EXPENSE_PAYMENT',
        expenseId: expense.id,
        amount: amountPerExpense,
        paymentDate: new Date(),
        paymentMethod: method.toUpperCase().replace(' ', '_'),
        notes: notes,
        status: 'PAID'
      }
    });

    // Update Expense
    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        amountPaid: newAmountPaid,
        paymentStatus: paymentStatus,
        status: status
      }
    });

    return payment;
  }));

  return results.filter(Boolean);
};

const deleteExpense = async (id) => {
  return await prisma.expense.delete({
    where: { id: parseInt(id) },
  });
};

const importExpenses = async (expensesArray) => {
  // 1. Extract unique vendor names from input
  const uniqueVendorNames = [...new Set(expensesArray.map(exp => 
    (exp.vendorName || exp.vendor || 'Unknown Account').trim()
  ))];

  // 2. Find existing vendors
  const existingVendors = await prisma.vendor.findMany({
    where: {
      name: { in: uniqueVendorNames }
    }
  });

  const vendorMap = existingVendors.reduce((acc, v) => {
    acc[v.name.toLowerCase()] = v.id;
    return acc;
  }, {});

  // 3. Create missing vendors
  for (const name of uniqueVendorNames) {
    if (!vendorMap[name.toLowerCase()]) {
      const newVendor = await prisma.vendor.create({
        data: { 
          name: name,
          categories: 'Others', // Default category for imported vendors
          isActive: true
        }
      });
      vendorMap[name.toLowerCase()] = newVendor.id;
    }
  }

  // 4. Transform data
  const dataToInsert = expensesArray.map(exp => {
    const vendorName = (exp.vendorName || exp.vendor || 'Unknown Account').trim().toLowerCase();
    const vendorId = vendorMap[vendorName];

    return {
      vendorId: vendorId,
      title: `${exp.category || 'Expense'} - ${exp.invoiceRef || exp.invoiceNumber || 'Imported'}`,
      amount: parseFloat(exp.amount) || 0,
      expenseDate: new Date(exp.date || new Date()),
      category: exp.category || 'Others',
      invoiceNumber: exp.invoiceRef || exp.invoiceNumber || null,
      branch: exp.branch || 'Tubli Branch',
      status: (exp.status || exp.paymentStatus || 'Unpaid').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
      paymentStatus: (exp.status || exp.paymentStatus || 'Unpaid').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
    };
  });

  // 5. Insert using createMany
  const result = await prisma.expense.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });

  return result;
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  processBatchPayment,
  importExpenses
};
