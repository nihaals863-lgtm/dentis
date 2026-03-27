const userService = require('../services/user.service');

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    let profileImageUrl = null;

    if (req.file) {
      profileImageUrl = `/uploads/profile/${req.file.filename}`;
    }

    const updatedProfile = await userService.updateProfile(req.user.id, {
      name,
      email,
      profileImageUrl,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...req.user,
        email: email || req.user.email,
        name: name || req.user.name,
        profileImage: profileImageUrl || req.user.profileImage, // Using profileImage for frontend compatibility
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
};
