const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Tariff = require('../models/Tariff');

dotenv.config({ path: path.join(__dirname, '../../../.env') });
const seedData = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is undefined. Check your .env file location.");
        }
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        // Clear existing initial data to prevent duplicates
        await Tariff.deleteMany({ category: 'LT-1A' });
        
        // 1. Seed 2026 TANGEDCO Domestic Tariff (LT-1A)
        const domesticTariff = new Tariff({
            category: 'LT-1A',
            description: 'Domestic Supply (Bi-Monthly)',
            effectiveDate: new Date('2026-07-01'),
            fixedChargePerKw: 0,
            tiers: [
                {
                    // TIER 1: <= 500 Units (Gets 200 Free Units)
                    conditionMaxUnits: 500,
                    freeUnits: 200,
                    slabs: [
                        { minUnits: 201, maxUnits: 400, ratePerUnit: 4.95 },
                        { minUnits: 401, maxUnits: 500, ratePerUnit: 6.65 }
                    ]
                },
                {
                    // TIER 2: > 500 Units (Gets only 100 Free Units)
                    conditionMaxUnits: 99999,
                    freeUnits: 100,
                    slabs: [
                        { minUnits: 101, maxUnits: 400, ratePerUnit: 4.95 },
                        { minUnits: 401, maxUnits: 500, ratePerUnit: 6.65 },
                        { minUnits: 501, maxUnits: 600, ratePerUnit: 8.80 },
                        { minUnits: 601, maxUnits: 800, ratePerUnit: 9.95 },
                        { minUnits: 801, maxUnits: 1000, ratePerUnit: 11.05 },
                        { minUnits: 1001, maxUnits: 99999, ratePerUnit: 12.15 }
                    ]
                }
            ]
        });

        await domesticTariff.save();
        console.log('2026 TANGEDCO LT-1A Tariff Seeded.');

        // 2. Seed Initial Admin Account (if it doesn't exist)
        let admin = await User.findOne({ email: 'admin@smarttn.gov' });
        if (!admin) {
            admin = await User.create({
                name: 'System Admin',
                email: 'admin@smarttn.gov',
                password: 'adminpassword123',
                role: 'ADMIN'
            });
            console.log('System Admin account created.');
        }

        // 3. Seed Initial Consumer Account (if it doesn't exist)
        let consumerUser = await User.findOne({ email: 'consumer@smarttn.gov' });
        if (!consumerUser) {
            consumerUser = await User.create({
                name: 'Rathi Chandhrika',
                email: 'consumer@smarttn.gov',
                password: 'consumer123',
                role: 'CONSUMER'
            });
            console.log('Test Consumer account created.');
        }

        let consumerProfile = await Consumer.findOne({ user: consumerUser._id });
        if (!consumerProfile) {
            await Consumer.create({
                user: consumerUser._id,
                serviceNumber: '04-123-001234',
                sanctionedLoadKw: 2.0,
                tariffCategory: 'LT-1A'
            });
            console.log('Consumer metadata attached.');
        }

        console.log('Data Seeding Complete!');
        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedData();