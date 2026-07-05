const express = require('express');
const router = express.Router();
const EmailAccount = require('../models/EmailAccount');

// Protect all routes with auth middleware
const { protect } = require('../middleware/auth.middleware');
router.use(protect);

// Get all email accounts for the company
router.get('/', async (req, res) => {
  try {
    const accounts = await EmailAccount.find({ companyId: req.company._id }).sort({ createdAt: -1 });
    res.json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new email account
router.post('/', async (req, res) => {
  try {
    const { emailAddress, provider, appPassword } = req.body;
    
    const account = new EmailAccount({
      companyId: req.company._id,
      emailAddress,
      provider,
      appPassword,
      dailySendLimit: 50, // Default for free plan MVP
      status: 'Active',
      plan: 'Free'
    });
    
    await account.save();
    res.status(201).json({ account, message: 'Email account connected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an email account
router.delete('/:id', async (req, res) => {
  try {
    const account = await EmailAccount.findOneAndDelete({ 
      _id: req.params.id, 
      companyId: req.company._id 
    });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
