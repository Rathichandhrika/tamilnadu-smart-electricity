const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../src/models/User');

async function ensureAdmin() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_tn_electricity';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB:', uri);

        let adminUser = await User.findOne({ email: 'admin@smarttn.gov' });
        if (!adminUser) {
            console.log('Admin user not found. Creating System Admin user...');
            adminUser = new User({
                name: 'System Admin',
                email: 'admin@smarttn.gov',
                password: 'adminpassword123',
                role: 'ADMIN',
                verificationStatus: 'APPROVED',
                district: 'Chennai'
            });
            await adminUser.save();
            console.log('Successfully created System Admin (admin@smarttn.gov / adminpassword123).');
        } else {
            console.log('Admin user already exists:', adminUser.email, adminUser.role);
            if (adminUser.role !== 'ADMIN') {
                adminUser.role = 'ADMIN';
                await adminUser.save();
                console.log('Updated adminUser role to ADMIN.');
            }
        }

        const allUsers = await User.find();
        console.log('\n--- Current Users in Database ---');
        allUsers.forEach(u => {
            console.log(`- ${u.name} | ${u.email} | Role: [${u.role}]`);
        });

    } catch (err) {
        console.error('Error ensuring admin:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

ensureAdmin();
