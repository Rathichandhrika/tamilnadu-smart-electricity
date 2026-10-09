const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../src/models/User');
const Consumer = require('../src/models/Consumer');
const Bill = require('../src/models/Bill');
const Alert = require('../src/models/Alert');
const IoTReading = require('../src/models/IoTReading');
const Prediction = require('../src/models/Prediction');

async function inspectAndCleanup() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_tn_electricity';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB:', uri);

        const allUsers = await User.find();
        console.log('--- Current Users in DB ---');
        allUsers.forEach(u => {
            console.log(`ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: "${u.role}"`);
        });

        // Identify users to keep: rathichandhrika, kala S, and ADMIN accounts
        const toKeep = allUsers.filter(u => {
            if (u.role === 'ADMIN') return true;
            const name = (u.name || '').toLowerCase().trim();
            const email = (u.email || '').toLowerCase().trim();
            return (
                name.includes('rathichandhrika') || 
                email.includes('rathichandhrika') ||
                email.includes('chandhrikarathi') ||
                name.includes('kala') || 
                email.includes('kala')
            );
        });

        const toRemove = allUsers.filter(u => !toKeep.some(k => k._id.toString() === u._id.toString()));

        console.log('\n--- Users to KEEP ---');
        toKeep.forEach(u => console.log(`KEEP: ${u.name} (${u.email}) [${u.role}]`));

        console.log('\n--- Users to REMOVE ---');
        toRemove.forEach(u => console.log(`REMOVE: ${u.name} (${u.email}) [${u.role}]`));

        if (toRemove.length > 0) {
            const removeUserIds = toRemove.map(u => u._id);
            
            // Find consumers associated with these users
            const consumersToRemove = await Consumer.find({ user: { $in: removeUserIds } });
            const consumerIds = consumersToRemove.map(c => c._id);

            // Delete associated records
            const deletedBills = await Bill.deleteMany({
                $or: [
                    { consumer: { $in: consumerIds } },
                    { user: { $in: removeUserIds } }
                ]
            });

            const deletedAlerts = await Alert.deleteMany({
                $or: [
                    { user: { $in: removeUserIds } },
                    { consumer: { $in: consumerIds } }
                ]
            });

            const deletedReadings = await IoTReading.deleteMany({ consumer: { $in: consumerIds } });
            const deletedPredictions = await Prediction.deleteMany({ consumer: { $in: consumerIds } });
            const deletedConsumers = await Consumer.deleteMany({ _id: { $in: consumerIds } });
            const deletedUsers = await User.deleteMany({ _id: { $in: removeUserIds } });

            console.log('\n--- Cleanup Results ---');
            console.log(`Deleted Users: ${deletedUsers.deletedCount}`);
            console.log(`Deleted Consumers: ${deletedConsumers.deletedCount}`);
            console.log(`Deleted Bills: ${deletedBills.deletedCount}`);
            console.log(`Deleted Alerts: ${deletedAlerts.deletedCount}`);
            console.log(`Deleted IoT Readings: ${deletedReadings.deletedCount}`);
            console.log(`Deleted Predictions: ${deletedPredictions.deletedCount}`);
        } else {
            console.log('\nNo old users to remove. Database already contains only specified users.');
        }

        const remainingUsers = await User.find();
        console.log(`\nRemaining users in DB (${remainingUsers.length}):`);
        remainingUsers.forEach(u => console.log(`- ${u.name} (${u.email}) [${u.role}]`));

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

inspectAndCleanup();
