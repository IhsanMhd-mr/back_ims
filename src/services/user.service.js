import UserRepo from "../repositories/user.repository.js"
// import AdminRepo from "../Repositories/adminRepository.js"
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from 'jsonwebtoken';
// import nodemailer from 'nodemailer';
import sequelize from "../config/db.js"
// import * as fireBaseService from "../Services/firebase.service.js";

const UserService = {

  validatorEmail: (email) => {
    return validator.isEmail(email);
  },
  validatorPassword: (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/;
    return passwordRegex.test(password);
  },
  //user registration 
  registerUser: async (email, password, firstName, lastName, contactNumber, role) => {
    try {
      // const existingAdmin = await AdminRepo.getAdminByEmail(email);
      // if (existingAdmin) {
      //   return {
      //     status: false,
      //     message: 'Email already exists!'
      //   };
      // }
      const existingUser = await UserRepo.getUserByEmail(email);
      if (existingUser) {
        return {
          status: false,
          message: 'User with this email already exists!'
        };
      }

      if (!UserService.validatorEmail(email)) {
        return {
          status: false,
          message: "Email is invalid!"
        };
      }

      // if (!UserService.validatorPassword(password)) {
      //   return {
      //     status: false,
      //     message: "Password must have at least one capital letter, one lowercase letter, one number, and one special character"
      //   };
      // }

      const encrypted_pw = await bcrypt.hash(password, 10);
      await sequelize.sync();
      const result = await UserRepo.registerUser(email, encrypted_pw, firstName, lastName, contactNumber, role);
      if (result) {
        // Token generated for registration
        const user = await UserRepo.getUserByEmail(email);
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.SECRET,
          { expiresIn: 259200 }

        );
        // if (user.role == "actor") {
        //   const actor = await ActorRepo.createActorProfile(user.id)
        // }
        // else if (user.role == "crew") {
        //   const crew = await crewRepo.createCrewProfile(user.id)
        // }
        // else if (user.role == "director" || "producer") {
        //   const directorOrProducer = await DirectorRepo.createDirectorProfile(user.id)
        // }
        return {
          status: true,
          message: 'User registered successfully',
          token: token,
          userId: user.id,
          jobTitle: user.jobTitle
        };
      }

    } catch (error) {
      return { status: false, message: error.message };
    }
  },



  userLogin: async (email, password) => {
    try {
      const user = await UserRepo.getUserByEmail(email);
      if (!user) {
        return {
          status: false,
          message: 'User data not found!',
        };
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return {
          status: false,
          message: 'Incorrect password!',
        };
      } else {
        //token generated for login
        if (user) {
          const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.SECRET,
            { expiresIn: 259200 }
          )

          const deactivatedUser = await UserRepo.getUserByEmailAdminActivate(email);
          let access = {
            access: "approved",
            adminActive: (deactivatedUser.dataValues.adminActive),
            // userActive: deactivatedUser.dataValues.userActive
          }
          if (deactivatedUser && (!deactivatedUser.dataValues.adminActive
            // || !deactivatedUser.dataValues.userActive
          )) {
            access.access = "denied"

            return {
              status: false,
              message: `Account Deactivated by Admin. Contact support! `,
              access: access,
              user: deactivatedUser
            };
          }

          return {
            status: true,
            message: 'Login Successfully!',
            token: token,
            access: access,
            user: user
          };
        } else {
          return {
            status: false,
            message: 'Token generate error',
          }
        }

      }
    } catch (error) {
      throw error;
    }
  },

  deleteUserById: async (userId) => {
    try {
      const result = await UserRepo.deleteUserById(userId);
      return result > 0;
    } catch (error) {
      throw error;
    }
  },
  getUserById: async (userId) => {
    try {
      const user = await UserRepo.getUserById(userId);
      return user;
    } catch (error) {
      throw error;
    }
  },




}

export default UserService;