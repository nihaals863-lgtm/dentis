const documentService = require('../services/document.service');
const path = require('path');

// Remove mapCategory and use raw string from body since schema is now String
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, title, description, vendorId, labCaseId, expenseId, paymentId, employeeId, laboratoryId, branch } = req.body;

    // Build a public URL path from the multer saved path
    const fileUrl = `/uploads/${path.basename(req.file.path)}`;

    const document = await documentService.createDocument({
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype,
      fileSizeKb: Math.round(req.file.size / 1024),
      category: category || 'General',
      title: title || req.file.originalname,
      description,
      branch,
      vendorId,
      labCaseId,
      expenseId,
      paymentId,
      employeeId,
      laboratoryId,
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
