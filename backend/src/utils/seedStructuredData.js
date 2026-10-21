const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');

async function seedStructuredBillsAndAlerts() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        // Wipe all existing bills and alerts to have a clean, perfectly structured state
        await Bill.deleteMany({});
        await Alert.deleteMany({});
        console.log('Cleared existing Bill and Alert records.');

        const now = new Date();
        const pastDueDateJulyAug = new Date('2026-08-25T18:00:00.000Z');
        const paidDateJulyAug = new Date('2026-08-20T10:30:00.000Z');

        // Accounts list to process
        // 1. chandhrikarathi09@gmail.com: July-August PAID (Receipt Alert) + September-October UNPAID (Due Reminder Alert)
        // 2. sudhakarrm09@gmail.com: July-August PAID (Receipt Alert) + September-October UNPAID (Due Reminder Alert)
        // 3. pavanab39@gmail.com: July-August PAID (Receipt Alert) + September-October OVERDUE with ₹150 Fine (Fine Due Alert)
        // 4. rmsudhakar67@gmail.com: Same as Sudhakar (PAID Receipt + Due Reminder)
        // 5. consumer@smarttn.gov: (PAID Receipt + Due Reminder)

        // Find or ensure users and consumers
        const targetConfigs = [
            {
                email: 'chandhrikarathi09@gmail.com',
                name: 'Rathichandhrika S',
                serviceNumber: '65-3563-2425',
                district: 'Mayiladuthurai',
                connectionType: 'LT-1A_DOMESTIC',
                julyUnits: 280,
                julyAmount: 1250,
                julyTx: 'TNEB-QPAY-94827101',
                // Current bill config
                currentMonth: 'September - October 2026',
                currentUnits: 320,
                currentAmount: 1420,
                currentStatus: 'UNPAID',
                currentDueDate: new Date(Date.now() + 3 * 86400000), // Due in 3 days
                fineAmount: 0,
                alertCategory: 'DUE_REMINDER'
            },
            {
                email: 'sudhakarrm09@gmail.com',
                name: 'Kala S',
                serviceNumber: '06-528-003-2106',
                district: 'Mayiladuthurai',
                connectionType: 'LT-1A_DOMESTIC',
                julyUnits: 300,
                julyAmount: 1350,
                julyTx: 'TNEB-QPAY-88319245',
                // Current bill config
                currentMonth: 'September - October 2026',
                currentUnits: 330,
                currentAmount: 1450,
                currentStatus: 'UNPAID',
                currentDueDate: new Date(Date.now() + 2 * 86400000), // Due in 2 days
                fineAmount: 0,
                alertCategory: 'DUE_REMINDER'
            },
            {
                email: 'pavanab39@gmail.com',
                name: 'B PAVANA',
                serviceNumber: '04-123-56889',
                district: 'Coimbatore',
                connectionType: 'LT-1A_DOMESTIC',
                julyUnits: 420,
                julyAmount: 1950,
                julyTx: 'TNEB-QPAY-67123984',
                // Current bill config -> OVERDUE with FINE
                currentMonth: 'September - October 2026',
                currentUnits: 450,
                currentAmount: 2150,
                currentStatus: 'OVERDUE',
                currentDueDate: new Date(Date.now() - 5 * 86400000), // Overdue by 5 days
                fineAmount: 150,
                fineReason: 'TANGEDCO Late Payment Surcharge (LPSC) - 5 days overdue',
                alertCategory: 'FINE_DUE'
            },
            {
                email: 'rmsudhakar67@gmail.com',
                name: 'R M Sudhakar',
                serviceNumber: '02-254-164-5452',
                district: 'Nagapattinam',
                connectionType: 'LT-1A_DOMESTIC',
                julyUnits: 310,
                julyAmount: 1380,
                julyTx: 'TNEB-QPAY-55910283',
                currentMonth: 'September - October 2026',
                currentUnits: 340,
                currentAmount: 1490,
                currentStatus: 'UNPAID',
                currentDueDate: new Date(Date.now() + 2 * 86400000),
                fineAmount: 0,
                alertCategory: 'DUE_REMINDER'
            },
            {
                email: 'consumer@smarttn.gov',
                name: 'Rathi Chandhrika',
                serviceNumber: '04-123-001234',
                district: 'Tiruchirappalli',
                connectionType: 'LT-1A_DOMESTIC',
                julyUnits: 190,
                julyAmount: 760,
                julyTx: 'TNEB-QPAY-44109823',
                currentMonth: 'September - October 2026',
                currentUnits: 210,
                currentAmount: 890,
                currentStatus: 'UNPAID',
                currentDueDate: new Date(Date.now() + 2 * 86400000),
                fineAmount: 0,
                alertCategory: 'DUE_REMINDER'
            }
        ];

        for (const cfg of targetConfigs) {
            const user = await User.findOne({ email: cfg.email });
            if (!user) {
                console.log(`User not found: ${cfg.email}, skipping.`);
                continue;
            }

            let consumer = await Consumer.findOne({ user: user._id });
            if (!consumer) {
                consumer = await Consumer.create({
                    user: user._id,
                    serviceNumber: cfg.serviceNumber,
                    tariffCategory: 'LT-1A',
                    connectionType: cfg.connectionType,
                    district: cfg.district,
                    sanctionedLoadKw: 2.0,
                    verificationStatus: 'APPROVED'
                });
            } else {
                consumer.serviceNumber = cfg.serviceNumber;
                consumer.district = cfg.district;
                consumer.connectionType = cfg.connectionType;
                await consumer.save();
            }

            user.district = cfg.district;
            user.role = 'CONSUMER'; // Ensure never admin
            await user.save();

            // 1. BILL 1: July - August 2026 (PAID with Official Receipt)
            const julyBill = await Bill.create({
                consumer: consumer._id,
                billingMonth: 'July - August 2026',
                connectionType: cfg.connectionType,
                unitsConsumed: cfg.julyUnits,
                energyCharge: cfg.julyAmount - 120,
                fixedCharge: 80,
                electricityTax: 40,
                totalAmount: cfg.julyAmount,
                dueDate: pastDueDateJulyAug,
                status: 'PAID',
                paidAt: paidDateJulyAug,
                paymentMode: 'TANGEDCO_QUICKPAY',
                transactionRef: cfg.julyTx,
                paymentVerificationStatus: 'VERIFIED',
                verifiedAt: paidDateJulyAug,
                fineAmount: 0,
                fineImposed: false,
                slabBreakdown: [
                    { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                    { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                    { slab: `201 - ${cfg.julyUnits} Units`, units: cfg.julyUnits - 200, rate: 4.5, amount: (cfg.julyUnits - 200) * 4.5 }
                ]
            });

            // ALERT 1: PAYMENT_SUCCESS Receipt Notification for July - August 2026
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'LOW',
                title: 'TANGEDCO Official Tax Invoice & Receipt Generated',
                titleTa: 'மின்கட்டணப் பதிவு அதிகாரப்பூர்வமாக உறுதிசெய்யப்பட்டு ரசீது வழங்கப்பட்டது',
                message: `Payment Verified: ₹${cfg.julyAmount.toLocaleString()} for July - August 2026 via TANGEDCO Quick Pay. Transaction Reference: ${cfg.julyTx}. Your official tax invoice and payment receipt are ready to download.`,
                messageTa: `TANGEDCO சரிபார்ப்பு முடிவு: July - August 2026 மாதத்திற்கான உங்கள் கட்டண ரசீது (${cfg.julyTx} - ₹${cfg.julyAmount.toLocaleString()}) நிர்வாக அதிகாரியால் சரிபார்க்கப்பட்டு கட்டணம் செலுத்தப்பட்டதாகப் பதிவு செய்யப்பட்டது. அதிகாரப்பூர்வ ரசீது பதிவிறக்கம் செய்யத் தயாராக உள்ளது.`,
                consumer: consumer._id,
                user: user._id,
                bill: julyBill._id,
                isResolved: false,
                createdAt: paidDateJulyAug
            });

            // 2. BILL 2: Current Bill (September - October 2026)
            if (cfg.alertCategory === 'FINE_DUE') {
                // PAVANA: Overdue with ₹150 Fine
                const currentBill = await Bill.create({
                    consumer: consumer._id,
                    billingMonth: cfg.currentMonth,
                    connectionType: cfg.connectionType,
                    unitsConsumed: cfg.currentUnits,
                    energyCharge: cfg.currentAmount - 200,
                    fixedCharge: 120,
                    electricityTax: 80,
                    totalAmount: cfg.currentAmount,
                    dueDate: cfg.currentDueDate,
                    status: 'OVERDUE',
                    fineAmount: cfg.fineAmount,
                    fineImposed: true,
                    fineReason: cfg.fineReason,
                    fineImposedAt: new Date(),
                    paymentVerificationStatus: 'NONE',
                    fineAlertSent: true,
                    slabBreakdown: [
                        { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                        { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                        { slab: '201 - 400 Units', units: 200, rate: 4.5, amount: 900 },
                        { slab: '401 - 450 Units', units: 50, rate: 6.0, amount: 300 }
                    ]
                });

                // ALERT 2: FINE_IMPOSED Alert
                await Alert.create({
                    type: 'FINE_IMPOSED',
                    severity: 'HIGH',
                    title: 'TANGEDCO Late Payment Surcharge (LPSC) Imposed',
                    titleTa: 'தாமத அபராதக் கட்டணம் விதிக்கப்பட்டது',
                    message: `Statutory Warning: Your electricity bill of ₹${cfg.currentAmount.toLocaleString()} for ${cfg.currentMonth} is overdue. A late fee surcharge of ₹${cfg.fineAmount} has been applied. Total Payable: ₹${(cfg.currentAmount + cfg.fineAmount).toLocaleString()}. Please settle immediately via TANGEDCO Quick Pay to avoid supply disconnection.`,
                    messageTa: `சட்டப்பூர்வ எச்சரிக்கை: ${cfg.currentMonth} மாத மின்கட்டணம் ₹${cfg.currentAmount.toLocaleString()} நிலுவைத் தேதியைத் தாண்டிவிட்டதால் ₹${cfg.fineAmount} தாமத அபராதம் விதிக்கப்பட்டுள்ளது. செலுத்த வேண்டிய மொத்தத் தொகை: ₹${(cfg.currentAmount + cfg.fineAmount).toLocaleString()}. மின் துண்டிப்பைத் தவிர்க்க உடனடியாக TANGEDCO தளத்தில் செலுத்தவும்.`,
                    consumer: consumer._id,
                    user: user._id,
                    bill: currentBill._id,
                    fineAmount: cfg.fineAmount,
                    isResolved: false,
                    createdAt: new Date()
                });

                console.log(`✅ [FINE DUE] Seeded for ${cfg.email}: July-August PAID receipt + September-October OVERDUE fine.`);
            } else {
                // CHANDHRIKARATHI & SUDHAKAR: Unpaid with Due Reminder Alert
                const daysRemaining = Math.max(1, Math.ceil((cfg.currentDueDate - now) / 86400000));
                const dueDateFormatted = cfg.currentDueDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const currentBill = await Bill.create({
                    consumer: consumer._id,
                    billingMonth: cfg.currentMonth,
                    connectionType: cfg.connectionType,
                    unitsConsumed: cfg.currentUnits,
                    energyCharge: cfg.currentAmount - 150,
                    fixedCharge: 90,
                    electricityTax: 60,
                    totalAmount: cfg.currentAmount,
                    dueDate: cfg.currentDueDate,
                    status: 'UNPAID',
                    fineAmount: 0,
                    fineImposed: false,
                    paymentVerificationStatus: 'NONE',
                    dueAlertSent: true,
                    slabBreakdown: [
                        { slab: '0 - 100 Units', units: 100, rate: 0, amount: 0 },
                        { slab: '101 - 200 Units', units: 100, rate: 2.25, amount: 225 },
                        { slab: `201 - ${cfg.currentUnits} Units`, units: cfg.currentUnits - 200, rate: 4.5, amount: (cfg.currentUnits - 200) * 4.5 }
                    ]
                });

                // ALERT 2: DUE_DATE_NEAR Alert
                await Alert.create({
                    type: 'DUE_DATE_NEAR',
                    severity: 'HIGH',
                    title: `TANGEDCO Due Reminder (Due in ${daysRemaining} Days)`,
                    titleTa: `கட்டணக் கடைசி நாள் நினைவூட்டல் (இன்னும் ${daysRemaining} நாட்கள்)`,
                    message: `Official Reminder: Your electricity bill of ₹${cfg.currentAmount.toLocaleString()} for ${cfg.currentMonth} is due in ${daysRemaining} days (${dueDateFormatted}). Settle online via TANGEDCO Quick Pay to prevent late payment surcharge.`,
                    messageTa: `அறிவிப்பு: உங்கள் ${cfg.currentMonth} மாத மின்கட்டணம் ₹${cfg.currentAmount.toLocaleString()} செலுத்த இன்னும் ${daysRemaining} நாட்களே உள்ளன (கடைசி நாள்: ${dueDateFormatted}). தாமத அபராதக் கட்டணத்தைத் தவிர்க்க உடனே செலுத்தவும்.`,
                    consumer: consumer._id,
                    user: user._id,
                    bill: currentBill._id,
                    fineAmount: 150,
                    isResolved: false,
                    createdAt: new Date()
                });

                console.log(`✅ [DUE REMINDER] Seeded for ${cfg.email}: July-August PAID receipt + September-October DUE reminder.`);
            }
        }

        console.log('\n--- VERIFICATION OF DATABASE ---');
        const allAlerts = await Alert.find({}).populate('user').populate('bill');
        for (const a of allAlerts) {
            console.log(`Alert: [${a.type}] for ${a.user?.email} -> ${a.title} (Bill: ${a.bill?.billingMonth})`);
        }

        console.log('\nAll accounts configured exactly per user requirements!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding structured data:', err);
        process.exit(1);
    }
}

seedStructuredBillsAndAlerts();
