const documentService = require('../services/document.service');
const path = require('path');

// Map UI-friendly category labels to Prisma DocumentCategory enum values
const mapCategory = (cat) => {
  const map = {
    'Lab Case': 'REPORT',
    'Vendor': 'INVOICE',
    'Employee': 'CONTRACT',
    'Payment': 'RECEIPT',
    'Expense': 'EXPENSE',
    'General': 'OTHER',
    'CONTRACT': 'CONTRACT',
    'INVOICE': 'INVOICE',
    'RECEIPT': 'RECEIPT',
    'EXPENSE': 'EXPENSE',
    'REPORT': 'REPORT',
    'IMAGE': 'IMAGE',
    'OTHER': 'OTHER',
  };
  return map[cat] || 'OTHER';
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, title, description, vendorId, labCaseId, expenseId, paymentId } = req.body;

    // Build a public URL path from the multer saved path
    const fileUrl = `/uploads/${path.basename(req.file.path)}`;

    const document = await documentService.createDocument({
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSizeKb: Math.round(req.file.size / 1024),
      category: mapCategory(category),
      title: title || req.file.originalname,
      description,
      vendorId,
      labCaseId,
      expenseId,
      paymentId,
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

const getAllDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.getAllDocuments();
    res.json(documents || []);
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
};
