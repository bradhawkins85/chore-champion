#!/usr/bin/env node

/**
 * Admin User Management Script
 * 
 * This script helps manage admin users in the ChoreQuest platform.
 * It allows you to promote existing users to admin role or create new admin users.
 * 
 * Usage:
 *   node dist/utils/promote-admin.js <email>
 *   node dist/utils/promote-admin.js <email> <password>
 * 
 * Example:
 *   node dist/utils/promote-admin.js admin@example.com
 *   node dist/utils/promote-admin.js admin@example.com SecurePassword123!
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST || 'mysql',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'chorequest',
  password: process.env.MYSQL_PASSWORD || 'chorequest',
  database: process.env.MYSQL_DATABASE || 'chorequest',
};

async function promoteToAdmin(email: string) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Check if user exists
    const [users] = await connection.query(
      'SELECT id, email, role, tenant_id FROM users WHERE email = ?',
      [email]
    );

    if ((users as any[]).length === 0) {
      console.log(`❌ User with email ${email} not found.`);
      console.log('\nWould you like to create a new admin user?');
      console.log('To create a new admin user, use: node dist/utils/promote-admin.js <email> <password>');
      return;
    }

    const user = (users as any[])[0];

    if (user.role === 'admin') {
      console.log(`✓ User ${email} is already an admin.`);
      return;
    }

    // Promote user to admin
    await connection.query(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', user.id]
    );

    console.log(`✅ Successfully promoted ${email} to admin role!`);
    console.log(`\nUser details:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Tenant ID: ${user.tenant_id}`);
    console.log(`  New Role: admin`);
    console.log(`\nThe user can now access the admin panel at /admin`);
  } catch (error) {
    console.error('❌ Error promoting user to admin:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function createAdminUser(email: string, password: string) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Check if user already exists
    const [existingUsers] = await connection.query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if ((existingUsers as any[]).length > 0) {
      const user = (existingUsers as any[])[0];
      if (user.role === 'admin') {
        console.log(`✓ User ${email} already exists as an admin.`);
        return;
      } else {
        console.log(`❌ User ${email} already exists as a ${user.role}.`);
        console.log('Use: node dist/utils/promote-admin.js <email> to promote this user to admin.');
        return;
      }
    }

    // Create a new tenant for the admin user
    const tenantId = uuidv4();
    await connection.query(
      'INSERT INTO tenants (id) VALUES (?)',
      [tenantId]
    );

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the admin user
    const userId = uuidv4();
    await connection.query(
      'INSERT INTO users (id, email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, passwordHash, tenantId, 'admin']
    );

    console.log(`✅ Successfully created admin user!`);
    console.log(`\nUser details:`);
    console.log(`  ID: ${userId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Tenant ID: ${tenantId}`);
    console.log(`  Role: admin`);
    console.log(`\nThe user can now log in and access the admin panel at /admin`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Admin User Management Script');
  console.log('============================\n');
  console.log('Usage:');
  console.log('  Promote existing user:  node dist/utils/promote-admin.js <email>');
  console.log('  Create new admin:       node dist/utils/promote-admin.js <email> <password>');
  console.log('\nExamples:');
  console.log('  node dist/utils/promote-admin.js admin@example.com');
  console.log('  node dist/utils/promote-admin.js admin@example.com SecurePassword123!');
  process.exit(1);
}

const [email, password] = args;

if (!email) {
  console.error('❌ Email is required');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

if (password) {
  // Create new admin user
  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    process.exit(1);
  }
  createAdminUser(email, password).catch(err => {
    console.error('Failed to create admin user:', err.message);
    process.exit(1);
  });
} else {
  // Promote existing user
  promoteToAdmin(email).catch(err => {
    console.error('Failed to promote user:', err.message);
    process.exit(1);
  });
}
