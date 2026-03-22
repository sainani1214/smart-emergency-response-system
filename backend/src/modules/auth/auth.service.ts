import { User } from '../../models/User';
import { Responder } from '../../models/Responder';
import { hashPassword, comparePassword, generateToken, generateUserId } from '../../utils/auth';
import type {
  RegisterUserDTO,
  RegisterResponderDTO,
  LoginDTO,
  UpdateProfileDTO,
  AuthResponse,
} from './auth.types';

export class AuthService {
  /**
   * Register a new user (citizen)
   */
  async registerUser(data: RegisterUserDTO): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: data.email }, { phone: data.phone }],
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email or phone already exists',
        };
      }

      // Hash password
      const password_hash = await hashPassword(data.password);

      // Generate user ID
      const user_id = generateUserId('USR');

      // Create user
      const user = new User({
        user_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_hash,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          coordinates: data.coordinates,
        },
      });

      await user.save();

      // Generate JWT token
      const token = generateToken({
        userId: user.user_id,
        role: 'user',
        email: user.email,
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: 'user',
          },
        },
      };
    } catch (error: any) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: error.message || 'Failed to register user',
      };
    }
  }

  /**
   * Register a new responder
   */
  async registerResponder(data: RegisterResponderDTO): Promise<AuthResponse> {
    try {
      // Check if responder already exists
      const existingResponder = await Responder.findOne({
        $or: [
          { email: data.email },
          { phone: data.phone },
          ...(data.badge_number ? [{ badge_number: data.badge_number }] : []),
        ],
      });

      if (existingResponder) {
        return {
          success: false,
          error: 'Responder with this email, phone, or badge number already exists',
        };
      }

      // Hash password
      const password_hash = await hashPassword(data.password);

      // Generate responder ID
      const responder_id = generateUserId('RSP');

      // Create responder
      const responder = new Responder({
        responder_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_hash,
        responder_type: data.responder_type,
        badge_number: data.badge_number,
        skills: data.skills || [],
        certifications: data.certifications || [],
        experience_years: data.experience_years,
      });

      await responder.save();

      // Generate JWT token
      const token = generateToken({
        userId: responder.responder_id,
        role: 'responder',
        email: responder.email,
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: responder.responder_id,
            name: responder.name,
            email: responder.email,
            role: 'responder',
          },
        },
      };
    } catch (error: any) {
      console.error('Error registering responder:', error);
      return {
        success: false,
        error: error.message || 'Failed to register responder',
      };
    }
  }

  /**
   * Login user or responder
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    try {
      let user: any = null;
      let userId: string = '';

      if (data.role === 'user') {
        user = await User.findOne({ email: data.email, is_active: true });
        if (user) userId = user.user_id;
      } else if (data.role === 'responder') {
        user = await Responder.findOne({ email: data.email, is_active: true });
        if (user) userId = user.responder_id;
      }

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Compare password
      const isPasswordValid = await comparePassword(data.password, user.password_hash);

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Update last login
      user.last_login = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken({
        userId,
        role: data.role,
        email: user.email,
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: userId,
            name: user.name,
            email: user.email,
            role: data.role,
          },
        },
      };
    } catch (error: any) {
      console.error('Error logging in:', error);
      return {
        success: false,
        error: error.message || 'Failed to login',
      };
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string, role: 'user' | 'responder') {
    try {
      if (role === 'user') {
        const user = await User.findOne({ user_id: userId }).select('-password_hash');
        return { success: true, data: user };
      } else {
        const responder = await Responder.findOne({ responder_id: userId })
          .select('-password_hash')
          .populate('assigned_resource_id');
        return { success: true, data: responder };
      }
    } catch (error: any) {
      console.error('Error getting profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to get profile',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    role: 'user' | 'responder',
    data: UpdateProfileDTO
  ) {
    try {
      if (role === 'user') {
        const user = await User.findOneAndUpdate(
          { user_id: userId },
          { $set: data },
          { new: true }
        ).select('-password_hash');

        return { success: true, data: user };
      } else {
        const responder = await Responder.findOneAndUpdate(
          { responder_id: userId },
          { $set: data },
          { new: true }
        ).select('-password_hash');

        return { success: true, data: responder };
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  }
}

export const authService = new AuthService();
