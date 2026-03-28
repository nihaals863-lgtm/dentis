const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to map frontend payment methods to Prisma enums
const mapPaymentMethod = (method) => {
  if (!method) return 'CASH';
  const m = method.toUpperCase();
  if (m === 'CARD') return 'CREDIT_CARD';
  if (m === 'CASH') return 'CASH';
  if (m === 'CHEQUE') return 'CHEQUE';
  if (m.includes('BANK') || m.includes('TRANSFER')) return 'BANK_TRANSFER';
  if (m === 'ONLINE') return 'ONLINE';
  // Standardize other strings like "Bank Transfer"
  return m.replace(/\s+/g, '_');
};

const createPayment = async (paymentData) => {
  const { expenseId, labCaseId, amount, paymentDate, paymentMethod, referenceNumber, notes, paymentType } = paymentData;

  const payment = await prisma.payment.create({
    data: {
      paymentType,
      amount,
      paymentDate: new Date(paymentDate),
      paymentMethod: mapPaymentMethod(paymentMethod),
      referenceNumber,
      notes,
      ...(expenseId && { expense: { connect: { id: parseInt(expenseId) } } }),
      ...(labCaseId && { labCase: { connect: { id: parseInt(labCaseId) } } }),
    },
  });

  // Update expense status if it's an expense payment
  if (expenseId) {
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(expenseId) },
      include: { payments: true },
    });

    const totalPaid = expense.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const status = totalPaid >= parseFloat(expense.amount) ? 'PAID' : 'PENDING';
    const paymentStatus = totalPaid >= parseFloat(expense.amount) ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');

    await prisma.expense.update({
      where: { id: parseInt(expenseId) },
      data: { 
        amountPaid: totalPaid,
        status: status === 'PAID' ? 'PAID' : expense.status,
        paymentStatus 
      },
    });
  }

  return payment;
};

const processedBatchPayments = async (batchData) => {
  const { caseIds, amount, method, notes, payments: legacyPayments } = batchData;
  
  return await prisma.$transaction(async (tx) => {
    const results = [];

    // Handle new Case List format
    if (caseIds && Array.isArray(caseIds)) {
      const amountPerCase = parseFloat(amount) / caseIds.length;
      
      for (const id of caseIds) {
        const payment = await tx.payment.create({
          data: {
            paymentType: 'LABCASE_PAYMENT',
            amount: amountPerCase,
            paymentDate: new Date(),
            paymentMethod: mapPaymentMethod(method),
            notes: notes || 'Batch payment',
            labCase: { connect: { id: parseInt(id) } },
          },
        });

        // Get the updated case data to calculate status
        const labCase = await tx.labCase.findUnique({
          where: { id: parseInt(id) },
          include: { payments: true }
        });

        const totalPaid = labCase.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const cost = parseFloat(labCase.cost || 0);
        
        let paymentStatus = 'UNPAID';
        if (totalPaid >= cost && cost > 0) {
          paymentStatus = 'PAID';
        } else if (totalPaid > 0) {
          paymentStatus = 'PARTIAL';
        }

        await tx.labCase.update({
          where: { id: parseInt(id) },
          data: {
            amountPaid: totalPaid,
            paymentStatus: paymentStatus,
          },
        });
        results.push(payment);
      }
    } 
    // Handle legacy expense payments format if still needed
    else if (legacyPayments && Array.isArray(legacyPayments)) {
      for (const p of legacyPayments) {
        const payment = await tx.payment.create({
          data: {
            paymentType: 'EXPENSE_PAYMENT',
            amount: p.amount,
            paymentDate: new Date(),
            paymentMethod: p.paymentMethod ? p.paymentMethod.toUpperCase().replace(/\s+/g, '_') : 'CASH',
            expense: { connect: { id: parseInt(p.expenseId) } },
          },
        });

        const expense = await tx.expense.findUnique({
          where: { id: parseInt(p.expenseId) },
          include: { payments: true },
        });

        const totalPaid = expense.payments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0) + parseFloat(p.amount);
        const isFull = totalPaid >= parseFloat(expense.amount);

        await tx.expense.update({
          where: { id: parseInt(p.expenseId) },
          data: {
            amountPaid: totalPaid,
            status: isFull ? 'PAID' : expense.status,
            paymentStatus: isFull ? 'PAID' : 'PARTIAL',
          },
        });
        results.push(payment);
      }
    }
    
    return results;
  });
};

const getAllPayments = async () => {
    const payments = await prisma.payment.findMany({
        include: { 
          expense: { include: { vendor: true } }, 
          labCase: { include: { laboratory: true } },
          documents: true
        },
        orderBy: { paymentDate: 'desc' },
    });

    const formattedPayments = (payments || []).map(p => ({
        id: p.id,
        type: p.paymentType === "LABCASE_PAYMENT" ? "LAB" : "EXPENSE",
        itemName: p.labCaseId
          ? `Case #${p.labCaseId}`
          : `Expense #${p.expenseId}`,
        amount: Number(p.amount),
        method: p.paymentMethod || "Cash",
        status: "Paid", // All records in payment table are essentially paid
        date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : "",
        // Keep these for branch filtering and detail view if needed
        branch: p.labCase?.branch || p.expense?.branch,
        attachment: p.documents?.[0]?.fileUrl,
        notes: p.notes,
        referenceNumber: p.referenceNumber,
        originalData: p // Keep original just in case
    }));

    return formattedPayments;
};

const updatePayment = async (id, paymentData) => {
  const { amount, paymentDate, paymentMethod, referenceNumber, notes } = paymentData;
  return await prisma.payment.update({
    where: { id: parseInt(id) },
    data: {
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      referenceNumber,
      notes,
    },
  });
};

const deletePayment = async (id) => {
  return await prisma.payment.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  createPayment,
  processedBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};
