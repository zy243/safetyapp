// authController.js (ESM version)
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!JWT_SECRET) console.warn('JWT_SECRET not set.');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Generate JWT token
export const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
    });
};

// ----------------------
// CONTROLLER FUNCTIONS
// ----------------------

export const register = async (req, res) => { /* your code unchanged */ };
export const guestAuth = async (req, res) => { /* your code unchanged */ };
export const login = async (req, res) => { /* your code unchanged */ };
export const googleAuth = async (req, res) => { /* your code unchanged */ };
export const logout = (req, res) => { /* your code unchanged */ };
export const getMe = async (req, res) => { /* your code unchanged */ };
export const updateProfile = async (req, res) => { /* your code unchanged */ };
export const updatePrivacySettings = async (req, res) => { /* your code unchanged */ };
export const updatePreferences = async (req, res) => { /* your code unchanged */ };
export const manageTrustedCircle = async (req, res) => { /* your code unchanged */ };
export const manageEmergencyContacts = async (req, res) => { /* your code unchanged */ };
export const forgotPassword = async (req, res) => { /* your code unchanged */ };
export const resetPassword = async (req, res) => { /* your code unchanged */ };
export const verifyEmail = async (req, res) => { /* your code unchanged */ };
export const resendVerificationEmail = async (req, res) => { /* your code unchanged */ };
