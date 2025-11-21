import UserService from "../Services/userService.js";
import UserRepo from "../Repositories/userRepository.js";

const UserController = {
  registerUser: async (req, res) => {
    try {
      const { email, password, firstName,lastName,contactNumber,gender,role } = req.body;
      const result = await UserService.registerUser(email, password, firstName,lastName,contactNumber,gender,role );
      if (result.status) {
        res.status(200).json({
          response_code: 200,
          success: true,
          message: result.message,
          user: { userId: result.userId, email: result.email, role: result.role },
          token: result.token
        });
      } else {
        // Status is false, there is an error
        res.status(400).json({
          response_code: 400,
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response_code: 500,
        error: error,
        success: false,
        message: 'Error occurred while registering user'
      });
    }
  },

  userLogin: async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await UserService.userLogin(email, password);
      if (result.status) {
        // Status is true, so registration is successful
        res.status(200).json({
            response_code: 200,
            success: true,
            message: result.message,
            token: result.token,
            access: result.access,
            role: result.user.role
        });
    } else {
        // Status is false, there is an error
        res.status(400).json({
            response_code: 400,
            success: false,
            message: result.message,
            access: result.access
        });
    }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response_code: 500,
        error: 'Error occurred'
      });
    }
  },

  getUserById: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await UserRepo.getUserById(id);
      if (!result) return res.status(404).json({ success: false, message: 'User not found' });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  getAllUsersForUser: async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.role) filters.role = req.query.role;
      const result = await UserRepo.getUsers({ page, limit, filters });
      if (result.success) return res.status(200).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const payload = req.body || {};
      const result = await UserRepo.updateUser(id, payload);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'User not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  statusUpdate: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const statusParam = req.params.params;
      if (!id || !statusParam) return res.status(400).json({ success: false, message: 'Invalid parameters' });
      const status = String(statusParam);
      const result = await UserRepo.updateUserStatus(id, status);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'User not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  remove: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const deletedBy = req.body?.deletedBy ?? req.query?.deletedBy ?? null;
      const result = await UserRepo.deleteUser(id, deletedBy);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'User not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  adminDelete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await UserRepo.hardDeleteUser(id);
      if (result.success) return res.status(200).json(result);
      if (result.message === 'User not found') return res.status(404).json(result);
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};
export default UserController;