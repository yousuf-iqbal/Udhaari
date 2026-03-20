// models/authModel.js
// database queries for auth
// firebase handles passwords and otp — we only store profile data

const { sql, poolPromise } = require('../config/db');

// find user by email — used in login and verifyToken middleware
const findUserByEmail = async (email) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query(`select UserID, FullName, Email, Phone, City, Area,
                   CNIC, CNICPicture, ProfilePic,
                   IsVerified, IsBanned, Role, CreatedAt
            from Users
            where Email = @email`);
  return result.recordset[0];
};

// check if phone already exists
const findUserByPhone = async (phone) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('phone', sql.NVarChar, phone)
    .query(`select UserID from Users where Phone = @phone`);
  return result.recordset[0];
};

// save user profile after firebase registration
// firebase handles auth — we store everything else
const createUser = async ({ fullName, email, phone, city, area, cnic }) => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('fullName', sql.NVarChar, fullName)
    .input('email',    sql.NVarChar, email)
    .input('phone',    sql.NVarChar, phone)
    .input('city',     sql.NVarChar, city)
    .input('area',     sql.NVarChar, area || null)
    .input('cnic',     sql.NVarChar, cnic)
    .query(`insert into Users (FullName, Email, Phone, City, Area, CNIC)
            output inserted.UserID
            values (@fullName, @email, @phone, @city, @area, @cnic)`);
  return result.recordset[0].UserID;
};

// save cloudinary image urls after upload
const updateProfilePictures = async (email, profilePicUrl, cnicPictureUrl) => {
  const pool = await poolPromise;
  await pool.request()
    .input('email',       sql.NVarChar, email)
    .input('profilePic',  sql.NVarChar, profilePicUrl  || null)
    .input('cnicPicture', sql.NVarChar, cnicPictureUrl || null)
    .query(`update Users
            set ProfilePic  = @profilePic,
                CNICPicture = @cnicPicture
            where Email = @email`);
};

module.exports = {
  findUserByEmail,
  findUserByPhone,
  createUser,
  updateProfilePictures,
};