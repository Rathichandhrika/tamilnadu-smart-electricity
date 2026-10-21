const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');

async function seedDemo() {
    try {
        console.log('Connecting to database...');
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI not found in env');
        }
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected successfully.');

        // Find Consumers and Users
        const users = await User.find({ role: 'CONSUMER' });
        console.log(`Found ${users.length} consumer users in database.`);

        for (const u of users) {
            console.log(`- ${u.name} (${u.email}) [ID: ${u._id}]`);
        }

        // Clean existing Demo Bills and Alerts for clean demo run
        console.log('Cleaning old demo bills and alerts...');
        await Bill.deleteMany({});
        await Alert.deleteMany({});
        console.log('Cleaned Bills and Alerts collections.');

        // 1. User: chandhrikarathi09@gmail.com -> e-KYC PENDING with document + PENDING_VERIFICATION Bill
        const rathiUser = await User.findOne({ email: 'chandhrikarathi09@gmail.com' });
        if (rathiUser) {
            let rathiConsumer = await Consumer.findOne({ user: rathiUser._id });
            if (!rathiConsumer) {
                rathiConsumer = await Consumer.create({
                    user: rathiUser._id,
                    serviceNumber: '65-3563-2425',
                    tariffCategory: 'LT-1A',
                    connectionType: 'LT-1A_DOMESTIC',
                    district: rathiUser.district || 'Chennai',
                    sanctionedLoadKw: 2.0
                });
            }

            // Set KYC to PENDING with valid document
            const kycDoc = '/uploads/kyc/kyc-1792489936535-717556542.pdf';
            rathiConsumer.verificationStatus = 'PENDING';
            rathiConsumer.kycDocuments = [kycDoc];
            await rathiConsumer.save();

            rathiUser.role = 'CONSUMER';
            rathiUser.verificationStatus = 'PENDING';
            rathiUser.kycDocuments = [kycDoc];
            await rathiUser.save();

            // Create a PENDING_VERIFICATION Bill
            const submittedDate = new Date();
            const dueDate = new Date(Date.now() + 10 * 86400000);
            const rathiBill = await Bill.create({
                consumer: rathiConsumer._id,
                billingMonth: 'September - October 2026',
                connectionType: 'LT-1A_DOMESTIC',
                unitsConsumed: 320,
                energyCharge: 1250,
                fixedCharge: 110,
                electricityTax: 60,
                totalAmount: 1420,
                dueDate: dueDate,
                status: 'PENDING_VERIFICATION',
                fineAmount: 0,
                fineImposed: false,
                paymentVerificationStatus: 'PENDING',
                paymentMode: 'TANGEDCO_QUICKPAY',
                transactionRef: 'TNEB-QPAY-94827103',
                submittedAt: submittedDate,
                slabBreakdown: [
                    { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                    { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                    { slab: '201 - 320 Units', units: 120, rate: 4.5, amount: 540 }
                ]
            });

            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'MEDIUM',
                title: 'TANGEDCO Payment Reference Submitted',
                titleTa: 'கட்டண ரசீது எண் சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டது',
                message: 'Payment reference TNEB-QPAY-94827103 submitted for ₹1,420 (September - October 2026). Pending administrative ledger verification.',
                messageTa: 'September - October 2026 மாதத்திற்கான மின்கட்டண ரசீது எண் TNEB-QPAY-94827103 (₹1,420) சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது. நிர்வாகி சரிபார்த்த பின் ரசீது வழங்கப்படும்.',
                consumer: rathiConsumer._id,
                user: rathiUser._id,
                bill: rathiBill._id
            });

            console.log('✅ chandhrikarathi09@gmail.com seeded with PENDING e-KYC document and PENDING_VERIFICATION bill.');
        }

        // 2. User: pavanab39@gmail.com -> e-KYC APPROVED + OVERDUE bill with ₹150 FINE
        const pavanaUser = await User.findOne({ email: 'pavanab39@gmail.com' });
        if (pavanaUser) {
            let pavanaConsumer = await Consumer.findOne({ user: pavanaUser._id });
            if (!pavanaConsumer) {
                pavanaConsumer = await Consumer.create({
                    user: pavanaUser._id,
                    serviceNumber: '04-123-56889',
                    tariffCategory: 'LT-1A',
                    connectionType: 'LT-1A_DOMESTIC',
                    district: pavanaUser.district || 'Coimbatore',
                    sanctionedLoadKw: 2.0
                });
            }

            pavanaConsumer.verificationStatus = 'APPROVED';
            await pavanaConsumer.save();

            pavanaUser.verificationStatus = 'APPROVED';
            await pavanaUser.save();

            const overdueDueDate = new Date(Date.now() - 5 * 86400000); // 5 days ago
            const pavanaBill = await Bill.create({
                consumer: pavanaConsumer._id,
                billingMonth: 'July - August 2026',
                connectionType: 'LT-1A_DOMESTIC',
                unitsConsumed: 450,
                energyCharge: 1850,
                fixedCharge: 150,
                electricityTax: 150,
                totalAmount: 2150,
                fineAmount: 150,
                fineImposed: true,
                fineReason: 'TANGEDCO Late Payment Surcharge (LPSC) - 5 days overdue',
                fineImposedAt: new Date(),
                dueDate: overdueDueDate,
                status: 'OVERDUE',
                paymentVerificationStatus: 'NONE',
                fineAlertSent: true,
                slabBreakdown: [
                    { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                    { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                    { slab: '201 - 400 Units', units: 200, rate: 4.5, amount: 900 },
                    { slab: '401 - 450 Units', units: 50, rate: 6.0, amount: 300 }
                ]
            });

            await Alert.create({
                type: 'FINE_IMPOSED',
                severity: 'HIGH',
                title: 'TANGEDCO Late Payment Surcharge (LPSC) Imposed',
                titleTa: 'தாமத அபராதக் கட்டணம் விதிக்கப்பட்டது',
                message: 'Statutory Warning: Your electricity bill of ₹2,150 for July - August 2026 is overdue. A late fee surcharge of ₹150 has been applied. Total Payable: ₹2,300. Please settle immediately via TANGEDCO Quick Pay to avoid supply disconnection.',
                messageTa: 'சட்டப்பூர்வ எச்சரிக்கை: July - August 2026 மாத மின்கட்டணம் ₹2,150 நிலுவைத் தேதியைத் தாண்டிவிட்டதால் ₹150 தாமத அபராதம் விதிக்கப்பட்டுள்ளது. செலுத்த வேண்டிய மொத்தத் தொகை: ₹2,300. மின் துண்டிப்பைத் தவிர்க்க உடனடியாக TANGEDCO தளத்தில் செலுத்தவும்.',
                consumer: pavanaConsumer._id,
                user: pavanaUser._id,
                bill: pavanaBill._id,
                fineAmount: 150
            });

            console.log('✅ pavanab39@gmail.com seeded with OVERDUE bill + ₹150 fine and alert.');
        }

        // 3. User: consumer@smarttn.gov -> e-KYC APPROVED + NEARING_DUE bill (+2 days)
        const demoConsumerUser = await User.findOne({ email: 'consumer@smarttn.gov' });
        if (demoConsumerUser) {
            let demoConsumer = await Consumer.findOne({ user: demoConsumerUser._id });
            if (!demoConsumer) {
                demoConsumer = await Consumer.create({
                    user: demoConsumerUser._id,
                    serviceNumber: '04-123-001234',
                    tariffCategory: 'LT-1A',
                    connectionType: 'LT-1A_DOMESTIC',
                    district: 'Chennai',
                    sanctionedLoadKw: 2.0
                });
            }

            demoConsumer.verificationStatus = 'APPROVED';
            await demoConsumer.save();

            demoConsumerUser.verificationStatus = 'APPROVED';
            await demoConsumerUser.save();

            const nearingDueDate = new Date(Date.now() + 2 * 86400000); // 2 days in future
            const demoBill = await Bill.create({
                consumer: demoConsumer._id,
                billingMonth: 'September - October 2026',
                connectionType: 'LT-1A_DOMESTIC',
                unitsConsumed: 210,
                energyCharge: 780,
                fixedCharge: 70,
                electricityTax: 40,
                totalAmount: 890,
                fineAmount: 0,
                fineImposed: false,
                dueDate: nearingDueDate,
                status: 'UNPAID',
                paymentVerificationStatus: 'NONE',
                dueAlertSent: true,
                slabBreakdown: [
                    { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                    { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                    { slab: '201 - 210 Units', units: 10, rate: 4.5, amount: 45 }
                ]
            });

            await Alert.create({
                type: 'DUE_DATE_NEAR',
                severity: 'MEDIUM',
                title: 'TANGEDCO Bill Due in 2 Days',
                titleTa: 'மின்கட்டண இறுதி நாள் நினைவூட்டல் (இன்னும் 2 நாட்கள்)',
                message: 'Reminder: Your electricity bill of ₹890 for September - October 2026 is due in 2 days. Pay on or before due date to avoid late payment surcharge (₹150).',
                messageTa: 'நினைவூட்டல்: September - October 2026 மாதத்திற்கான உங்கள் மின்கட்டணம் ₹890 இன்னும் 2 நாட்களில் செலுத்தப்பட வேண்டும். ₹150 அபராதத்தைத் தவிர்க்க உடனே செலுத்தவும்.',
                consumer: demoConsumer._id,
                user: demoConsumerUser._id,
                bill: demoBill._id
            });

            console.log('✅ consumer@smarttn.gov seeded with NEARING_DUE bill (2 days left) and reminder alert.');
        }

        console.log('\n=============================================');
        console.log('🎉 DEMONSTRATION RECORDS SEEDED SUCCESSFULLY!');
        console.log('=============================================');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedDemo();
