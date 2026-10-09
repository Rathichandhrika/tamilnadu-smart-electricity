const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../src/models/User');
const Consumer = require('../src/models/Consumer');
const Bill = require('../src/models/Bill');

async function inspectBills() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_tn_electricity';
        await mongoose.connect(uri);
        const users = await User.find();
        console.log('--- Users ---');
        users.forEach(u => console.log(u.name, u.email, u.role));

        const consumers = await Consumer.find().populate('user');
        console.log('\n--- Consumers ---');
        consumers.forEach(c => console.log(c._id, c.serviceNumber, c.user?.name, c.district));

        const bills = await Bill.find().populate({
            path: 'consumer',
            populate: { path: 'user' }
        });
        console.log('\n--- Bills ---');
        bills.forEach(b => {
            console.log(`Bill ID: ${b._id} | User: ${b.consumer?.user?.name} | Month: ${b.billingMonth} | Amount: ₹${b.totalAmount} | Fine: ₹${b.fineAmount} | Status: ${b.status}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

inspectBills();
