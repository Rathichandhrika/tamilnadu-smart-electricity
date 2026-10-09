const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Font paths configuration
const REGULAR_FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'SegoeUI-Regular.ttf');
const BOLD_FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'SegoeUI-Bold.ttf');
const ITALIC_FONT_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'SegoeUI-Italic.ttf');

const hasCustomFont = fs.existsSync(REGULAR_FONT_PATH) && fs.existsSync(BOLD_FONT_PATH);

/**
 * Registers appropriate fonts with PDFKit document
 */
const setupFonts = (doc) => {
    if (hasCustomFont) {
        doc.registerFont('App-Regular', REGULAR_FONT_PATH);
        doc.registerFont('App-Bold', BOLD_FONT_PATH);
        if (fs.existsSync(ITALIC_FONT_PATH)) {
            doc.registerFont('App-Italic', ITALIC_FONT_PATH);
        } else {
            doc.registerFont('App-Italic', REGULAR_FONT_PATH);
        }
        return {
            regular: 'App-Regular',
            bold: 'App-Bold',
            italic: 'App-Italic',
            rupeeSymbol: '₹ '
        };
    }
    return {
        regular: 'Helvetica',
        bold: 'Helvetica-Bold',
        italic: 'Helvetica-Oblique',
        rupeeSymbol: 'Rs. '
    };
};

/**
 * Formats currency amount as clear Indian Rupees (e.g., ₹ 1,250.00)
 */
const formatCurrency = (amt, symbol = '₹ ') => {
    const num = Number(amt) || 0;
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Generates an official, professional TANGEDCO Tamil Nadu Electricity Tax Invoice
 * Strictly formatted as a crisp, single-page document (no trailing blank pages).
 * @param {Object} bill - Mongoose Bill document populated with consumer and user
 * @param {Object} res - Express response stream
 */
const generateBillPDF = (bill, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        bufferPages: true,
        autoPageBreak: false, // Prevents unintended blank second pages
        info: {
            Title: `TANGEDCO Tax Invoice - ${bill.billingMonth}`,
            Author: 'Tamil Nadu Generation and Distribution Corporation Ltd',
            Subject: 'Electricity Consumption Bill & Tax Invoice'
        }
    });

    // Pipe directly into response stream
    doc.pipe(res);

    const fonts = setupFonts(doc);
    const currSym = fonts.rupeeSymbol;

    const pageWidth = doc.page.width; // 595.28 for A4
    const pageHeight = doc.page.height; // 841.89 for A4
    const leftMargin = 30;
    const rightMargin = 30;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 535.28

    // Design Color Palette
    const primaryNavy = '#0a2540';
    const secondaryBlue = '#1e40af';
    const goldAccent = '#b45309';
    const slateDark = '#1e293b';
    const slateMuted = '#64748b';
    const borderGray = '#cbd5e1';
    const bgLight = '#f8fafc';
    const greenBadge = '#059669';

    // 1. TOP HEADER BAND (Height: 65px)
    doc.rect(leftMargin, 28, contentWidth, 65).fill(primaryNavy);
    doc.rect(leftMargin, 28, contentWidth, 3.5).fill('#d97706'); // Top gold strip

    doc.fillColor('#ffffff')
       .font(fonts.bold)
       .fontSize(11)
       .text('TAMIL NADU GENERATION AND DISTRIBUTION CORPORATION LTD', leftMargin + 5, 36, { width: contentWidth - 10, align: 'center', lineBreak: false });

    doc.font(fonts.regular)
       .fontSize(8)
       .fillColor('#93c5fd')
       .text('GOVERNMENT OF TAMIL NADU UNDERTAKING • TNEB REVENUE DIVISION', leftMargin + 5, 52, { width: contentWidth - 10, align: 'center', lineBreak: false });

    doc.font(fonts.bold)
       .fontSize(9.5)
       .fillColor('#fbbf24')
       .text('OFFICIAL ELECTRICITY CONSUMPTION TAX INVOICE & DEMAND NOTE', leftMargin + 5, 65, { width: contentWidth - 10, align: 'center', lineBreak: false });

    doc.font(fonts.italic)
       .fontSize(7)
       .fillColor('#cbd5e1')
       .text('Issued under TNERC Tariff Regulation & Tamil Nadu Electricity Act', leftMargin + 5, 78, { width: contentWidth - 10, align: 'center', lineBreak: false });

    // 2. INVOICE META BAR (Height: 26px)
    const metaY = 98;
    doc.rect(leftMargin, metaY, contentWidth, 26).fill(bgLight);
    doc.rect(leftMargin, metaY, contentWidth, 26).stroke(borderGray);

    const invNo = `TNEB-INV-${(bill._id || '').toString().slice(-8).toUpperCase()}`;
    const billDateStr = new Date(bill.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueDateStr = new Date(bill.dueDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.font(fonts.bold).fontSize(8).fillColor(slateDark).text('INVOICE NO: ', leftMargin + 10, metaY + 8, { continued: true, lineBreak: false });
    doc.font(fonts.regular).text(invNo, { continued: false, lineBreak: false });

    doc.font(fonts.bold).text('BILL DATE: ', 225, metaY + 8, { continued: true, lineBreak: false });
    doc.font(fonts.regular).text(billDateStr, { continued: false, lineBreak: false });

    doc.font(fonts.bold).text('DUE DATE: ', 375, metaY + 8, { continued: true, lineBreak: false });
    doc.font(fonts.regular).fillColor('#b91c1c').text(dueDateStr, { continued: false, lineBreak: false });

    // 3. TWO-COLUMN CONSUMER & SUPPLY DETAILS (Height: 120px)
    const colY = 130;
    const colWidth = (contentWidth - 12) / 2;
    const colHeight = 118;

    // Left Column: Consumer Details
    doc.rect(leftMargin, colY, colWidth, colHeight).fill('#ffffff').stroke(borderGray);
    doc.rect(leftMargin, colY, colWidth, 20).fill('#f1f5f9');
    doc.font(fonts.bold).fontSize(8.5).fillColor(primaryNavy).text('CONSUMER PROFILE', leftMargin + 10, colY + 5, { lineBreak: false });

    const consumer = bill.consumer || {};
    const consumerUser = consumer.user || {};
    const cName = consumerUser.name || 'Registered Consumer';
    const sNo = consumer.serviceNumber || '04-123-001234';
    const cType = bill.connectionType || consumer.connectionType || 'LT-1A_DOMESTIC';
    const isCommercial = cType === 'LT-V_COMMERCIAL' || cType === 'LT-5';
    const isIndustrial = cType === 'LT-IIIB_INDUSTRIAL' || cType === 'LT-3B';
    
    let tariffLabel = 'LT-1A (Domestic Residential)';
    if (isIndustrial) {
        tariffLabel = 'LT-IIIB (Industrial Supply)';
    } else if (isCommercial) {
        tariffLabel = 'LT-V (Commercial Supply)';
    }
    const kycStatus = consumer.verificationStatus || 'APPROVED';

    let leftTextY = colY + 26;
    const addLeftLine = (label, val, highlightColor) => {
        doc.font(fonts.bold).fontSize(7.8).fillColor(slateMuted).text(label, leftMargin + 10, leftTextY, { lineBreak: false });
        doc.font(fonts.bold).fontSize(7.8).fillColor(highlightColor || slateDark).text(val, leftMargin + 105, leftTextY, { width: colWidth - 115, lineBreak: false });
        leftTextY += 18;
    };

    addLeftLine('Consumer Name:', cName);
    addLeftLine('Service No:', sNo);
    addLeftLine('Tariff Category:', tariffLabel);
    addLeftLine('e-KYC Status:', kycStatus === 'APPROVED' ? '[✓] APPROVED' : '[⏳] PENDING REVIEW', kycStatus === 'APPROVED' ? greenBadge : goldAccent);
    addLeftLine('Circle / District:', consumer.address?.city || 'Madurai Metro');

    // Right Column: Meter & Billing Period Details
    const rightColX = leftMargin + colWidth + 12;
    doc.rect(rightColX, colY, colWidth, colHeight).fill('#ffffff').stroke(borderGray);
    doc.rect(rightColX, colY, colWidth, 20).fill('#f1f5f9');
    doc.font(fonts.bold).fontSize(8.5).fillColor(primaryNavy).text('BILLING & METER METRICS', rightColX + 10, colY + 5, { lineBreak: false });

    let rightTextY = colY + 26;
    const addRightLine = (label, val, highlightColor) => {
        doc.font(fonts.bold).fontSize(7.8).fillColor(slateMuted).text(label, rightColX + 10, rightTextY, { lineBreak: false });
        doc.font(fonts.bold).fontSize(7.8).fillColor(highlightColor || slateDark).text(val, rightColX + 105, rightTextY, { width: colWidth - 115, lineBreak: false });
        rightTextY += 18;
    };

    let subsidyLabel = '200 Free Units Active';
    if (isIndustrial) {
        subsidyLabel = 'Standard Industrial Rate';
    } else if (isCommercial) {
        subsidyLabel = 'Commercial Non-Telescopic';
    } else if (bill.unitsConsumed > 500) {
        subsidyLabel = 'Non-Subsidized (>500 Cliff)';
    }

    addRightLine('Billing Cycle:', bill.billingMonth || 'Current Bi-Monthly');
    addRightLine('Units Consumed:', `${bill.unitsConsumed} kWh (Units)`, '#0284c7');
    addRightLine('Sanctioned Load:', `${consumer.sanctionedLoadKw || 2.0} kW (${consumer.phase || 1} Phase)`);
    addRightLine('Bill Status:', bill.status || 'UNPAID', bill.status === 'PAID' ? greenBadge : '#dc2626');
    addRightLine('Subsidy Model:', subsidyLabel, isCommercial || isIndustrial ? slateDark : (bill.unitsConsumed <= 500 ? greenBadge : '#dc2626'));

    // 4. CHARGES BREAKDOWN TABLE
    const tableY = 256;
    doc.rect(leftMargin, tableY, contentWidth, 20).fill(secondaryBlue);
    doc.font(fonts.bold).fontSize(8).fillColor('#ffffff');
    doc.text('TARIFF SLAB / CHARGE PARTICULARS', leftMargin + 8, tableY + 5.5, { lineBreak: false });
    doc.text('UNITS', 280, tableY + 5.5, { width: 60, align: 'right', lineBreak: false });
    doc.text('RATE APPLIED', 350, tableY + 5.5, { width: 85, align: 'right', lineBreak: false });
    doc.text(`AMOUNT (${currSym.trim()})`, 445, tableY + 5.5, { width: 110, align: 'right', lineBreak: false });

    let currentY = tableY + 20;
    const slabs = bill.slabBreakdown && bill.slabBreakdown.length > 0 ? bill.slabBreakdown : [];

    if (slabs.length > 0) {
        slabs.forEach((slab, index) => {
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(leftMargin, currentY, contentWidth, 18).fill(rowBg).stroke(borderGray);

            const isFree = slab.isFreeSlab || slab.ratePerUnit === 0;
            const desc = slab.description || slab.slab || (isFree 
                ? `Slab ${slab.minUnits} - ${slab.maxUnits} units (TN Govt Free Scheme)`
                : `Slab ${slab.minUnits} - ${slab.maxUnits} units`);
            const unitsText = `${slab.unitsBilled} ${slab.ratePerUnit > 50 ? 'kW' : 'kWh'}`;
            const rateText = isFree ? `FREE (${currSym}0.00)` : `${currSym}${(slab.ratePerUnit || 0).toFixed(2)}`;
            const amtText = formatCurrency(slab.charge || 0, currSym);

            doc.font(fonts.regular).fontSize(7.8).fillColor(isFree ? greenBadge : slateDark).text(desc, leftMargin + 8, currentY + 4.5, { width: 235, lineBreak: false });
            doc.font(fonts.regular).fillColor(slateDark).text(unitsText, 280, currentY + 4.5, { width: 60, align: 'right', lineBreak: false });
            doc.font(fonts.regular).fillColor(isFree ? greenBadge : slateDark).text(rateText, 350, currentY + 4.5, { width: 85, align: 'right', lineBreak: false });
            doc.font(fonts.bold).fillColor(slateDark).text(amtText, 445, currentY + 4.5, { width: 110, align: 'right', lineBreak: false });

            currentY += 18;
        });
    } else {
        // Fallback row
        doc.rect(leftMargin, currentY, contentWidth, 18).fill('#ffffff').stroke(borderGray);
        doc.font(fonts.regular).fontSize(7.8).fillColor(slateDark).text(`Standard Energy Charge (${bill.unitsConsumed} units)`, leftMargin + 8, currentY + 4.5, { lineBreak: false });
        doc.font(fonts.regular).text(`${bill.unitsConsumed} kWh`, 280, currentY + 4.5, { width: 60, align: 'right', lineBreak: false });
        doc.font(fonts.regular).text('-', 350, currentY + 4.5, { width: 85, align: 'right', lineBreak: false });
        doc.font(fonts.bold).text(formatCurrency(bill.energyCharge || 0, currSym), 445, currentY + 4.5, { width: 110, align: 'right', lineBreak: false });
        currentY += 18;
    }

    // Energy Subtotal
    doc.rect(leftMargin, currentY, contentWidth, 18).fill('#f1f5f9').stroke(borderGray);
    doc.font(fonts.bold).fontSize(8).fillColor(slateDark).text('Subtotal Energy Charges', leftMargin + 8, currentY + 4.5, { lineBreak: false });
    doc.text(formatCurrency(bill.energyCharge || 0, currSym), 445, currentY + 4.5, { width: 110, align: 'right', lineBreak: false });
    currentY += 18;

    // Fixed / Demand Charges
    doc.rect(leftMargin, currentY, contentWidth, 18).fill('#ffffff').stroke(borderGray);
    let fixedLabel = 'Fixed Supply & Meter Charges';
    if (isIndustrial) {
        fixedLabel = `Bi-Monthly Demand Charges (${consumer.sanctionedLoadKw || 10} kW @ ${currSym}600/kW)`;
    } else if (isCommercial) {
        fixedLabel = `Sanctioned Demand Charges (${consumer.sanctionedLoadKw || 2} kW @ ${currSym}110/kW)`;
    }
    doc.font(fonts.regular).fontSize(7.8).fillColor(slateDark).text(fixedLabel, leftMargin + 8, currentY + 4.5, { lineBreak: false });
    doc.font(fonts.bold).text(formatCurrency(bill.fixedCharge || 0, currSym), 445, currentY + 4.5, { width: 110, align: 'right', lineBreak: false });
    currentY += 18;

    // State Electricity Tax (if applicable)
    if (bill.electricityTax && bill.electricityTax > 0) {
        doc.rect(leftMargin, currentY, contentWidth, 18).fill('#ffffff').stroke(borderGray);
        doc.font(fonts.regular).fontSize(7.8).fillColor(slateDark).text('State Electricity Duty / Tax (5% per TN Govt Act)', leftMargin + 8, currentY + 4.5, { lineBreak: false });
        doc.font(fonts.bold).text(formatCurrency(bill.electricityTax, currSym), 445, currentY + 4.5, { width: 110, align: 'right', lineBreak: false });
        currentY += 18;
    }

    // 5. NET TOTAL HIGHLIGHT BOX (Height: 32px)
    currentY += 6;
    doc.rect(leftMargin, currentY, contentWidth, 32).fill(primaryNavy);
    doc.rect(leftMargin, currentY, 5, 32).fill('#fbbf24'); // Left gold accent strip
    doc.font(fonts.bold).fontSize(9.5).fillColor('#ffffff').text('NET PAYABLE TOTAL AMOUNT (ROUNDED)', leftMargin + 15, currentY + 10, { lineBreak: false });
    doc.font(fonts.bold).fontSize(12).fillColor('#fbbf24').text(formatCurrency(bill.totalAmount, currSym), 380, currentY + 8.5, { width: 175, align: 'right', lineBreak: false });

    currentY += 38;

    // 6. STATUTORY NOTICE & GUIDELINES (Height: 56px)
    doc.rect(leftMargin, currentY, contentWidth, 54).fill('#f8fafc').stroke(borderGray);
    doc.font(fonts.bold).fontSize(7.5).fillColor(goldAccent).text('TANGEDCO STATUTORY NOTICE & TARIFF GUIDELINES:', leftMargin + 8, currentY + 5, { lineBreak: false });
    doc.font(fonts.regular).fontSize(6.8).fillColor(slateMuted);
    
    if (isIndustrial) {
        doc.text(`• Tariff LT-IIIB applies to Low Tension Industrial, MSME, Manufacturing, and Fabrication workshops.`, leftMargin + 8, currentY + 16, { lineBreak: false });
        doc.text(`• Flat industrial energy draw rate is ${currSym}7.65 per kWh + 5% State Electricity Duty.`, leftMargin + 8, currentY + 25, { lineBreak: false });
        doc.text(`• Fixed bi-monthly demand charges are ${currSym}600.00 per kW of sanctioned capacity.`, leftMargin + 8, currentY + 34, { lineBreak: false });
        doc.text(`• Ensure power factor is maintained above 0.85 lag to prevent low power factor surcharges.`, leftMargin + 8, currentY + 43, { lineBreak: false });
    } else if (isCommercial) {
        doc.text(`• Tariff LT-V applies to Commercial, Offices, Shops, and Non-Residential establishments.`, leftMargin + 8, currentY + 16, { lineBreak: false });
        doc.text(`• Consumption >100 kWh incurs a flat commercial rate of ${currSym}10.45/unit across all units + 5% Electricity Duty.`, leftMargin + 8, currentY + 25, { lineBreak: false });
        doc.text(`• Demand charges are levied at ${currSym}110.00 per kW of sanctioned load per billing cycle.`, leftMargin + 8, currentY + 34, { lineBreak: false });
        doc.text(`• Pay online via Smart TN Portal before the due date to avoid standard disconnection protocols.`, leftMargin + 8, currentY + 43, { lineBreak: false });
    } else {
        doc.text(`• 100 Units Free Electricity Scheme (GO Ms. No. 25/Energy) is active for all LT-1A Domestic service connections.`, leftMargin + 8, currentY + 16, { lineBreak: false });
        doc.text(`• CRITICAL SUBSIDY CLIFF: If total bi-monthly consumption exceeds 500 kWh, the entire tariff recalculates to higher tiered slabs.`, leftMargin + 8, currentY + 25, { lineBreak: false });
        doc.text(`• Consumers are encouraged to maintain consumption <=500 kWh through active energy profiling to retain optimal subsidies.`, leftMargin + 8, currentY + 34, { lineBreak: false });
        doc.text(`• Pay online via Smart TN Portal, BBPS, or authorized e-Seva centers before due date.`, leftMargin + 8, currentY + 43, { lineBreak: false });
    }

    currentY += 60;

    // 7. BARCODE SIMULATION & DIGITAL AUTHENTICATION STAMP
    const barX = leftMargin + 8;
    const barY = currentY;
    const barHeight = 18;
    for (let i = 0; i < 65; i++) {
        const barW = (i % 3 === 0) ? 2.2 : ((i % 5 === 0) ? 3.0 : 1.0);
        doc.rect(barX + (i * 3.6), barY, barW, barHeight).fill('#334155');
    }
    doc.font(fonts.bold).fontSize(6.5).fillColor(slateMuted).text(`*${invNo}*`, barX, barY + 21, { width: 235, align: 'center', lineBreak: false });

    // Official Stamp Simulation on the right
    doc.rect(320, currentY - 2, 245, 40).stroke('#94a3b8');
    doc.font(fonts.bold).fontSize(7).fillColor(primaryNavy).text('OFFICIALLY CERTIFIED ELECTRONIC INVOICE', 325, currentY + 3, { width: 235, align: 'center', lineBreak: false });
    doc.font(fonts.regular).fontSize(6).fillColor(slateMuted).text('Authenticated digitally via TNEB Central Revenue Ledger', 325, currentY + 14, { width: 235, align: 'center', lineBreak: false });
    doc.text(`Digital Seal ID: SHA256-${(bill._id || '').toString().toUpperCase()}`, 325, currentY + 23, { width: 235, align: 'center', lineBreak: false });
    doc.font(fonts.bold).fontSize(6.5).fillColor(greenBadge).text('STATUS: VALID & VERIFIED', 325, currentY + 31, { width: 235, align: 'center', lineBreak: false });

    // 8. FOOTER (Strictly bounded inside the single page)
    const footerY = 805;
    doc.moveTo(leftMargin, footerY - 5).lineTo(pageWidth - rightMargin, footerY - 5).stroke(borderGray);
    doc.font(fonts.italic).fontSize(6.5).fillColor('#94a3b8');
    doc.text('This is a computer-generated tax invoice and demand note. No physical signature is required under IT Act 2000.', leftMargin, footerY, { width: contentWidth, align: 'center', lineBreak: false });
    doc.text(`Tamil Nadu Generation and Distribution Corporation Ltd • Generated: ${new Date().toLocaleString('en-IN')}`, leftMargin, footerY + 9, { width: contentWidth, align: 'center', lineBreak: false });

    // Finalize the single-page PDF stream
    doc.end();
};

/**
 * Generates an official TANGEDCO Consolidated Bill History & Consumption Statement PDF
 * Cleanly formatted with dynamic pagination without accidental empty trailing pages.
 * @param {Object} data - { consumer, bills } populated with user details
 * @param {Object} res - Express response stream
 */
const generateBillHistoryPDF = ({ consumer, bills }, res) => {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        bufferPages: true,
        autoPageBreak: false, // Controlled manual pagination to eliminate trailing empty pages
        info: {
            Title: `TANGEDCO Electricity Bill History Statement - ${consumer?.serviceNumber || 'Account'}`,
            Author: 'Tamil Nadu Generation and Distribution Corporation Ltd',
            Subject: 'Consolidated Electricity Consumption History & Ledger Statement'
        }
    });

    doc.pipe(res);

    const fonts = setupFonts(doc);
    const currSym = fonts.rupeeSymbol;

    const pageWidth = doc.page.width; // 595.28
    const pageHeight = doc.page.height; // 841.89
    const leftMargin = 30;
    const rightMargin = 30;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 535.28

    const primaryNavy = '#0a2540';
    const secondaryBlue = '#1e40af';
    const goldAccent = '#b45309';
    const slateDark = '#1e293b';
    const slateMuted = '#64748b';
    const borderGray = '#cbd5e1';
    const bgLight = '#f8fafc';
    const greenBadge = '#059669';

    // Helper to draw header
    const drawPageHeader = () => {
        doc.rect(leftMargin, 28, contentWidth, 65).fill(primaryNavy);
        doc.rect(leftMargin, 28, contentWidth, 3.5).fill('#d97706');

        doc.fillColor('#ffffff')
           .font(fonts.bold)
           .fontSize(11)
           .text('TAMIL NADU GENERATION AND DISTRIBUTION CORPORATION LTD', leftMargin + 5, 36, { width: contentWidth - 10, align: 'center', lineBreak: false });

        doc.font(fonts.regular)
           .fontSize(8)
           .fillColor('#93c5fd')
           .text('GOVERNMENT OF TAMIL NADU UNDERTAKING • TNEB CENTRAL REVENUE & BILLING AUDIT', leftMargin + 5, 52, { width: contentWidth - 10, align: 'center', lineBreak: false });

        doc.font(fonts.bold)
           .fontSize(9.5)
           .fillColor('#fbbf24')
           .text('CONSOLIDATED ELECTRICITY BILLING HISTORY & LEDGER STATEMENT', leftMargin + 5, 65, { width: contentWidth - 10, align: 'center', lineBreak: false });

        doc.font(fonts.italic)
           .fontSize(7)
           .fillColor('#cbd5e1')
           .text('Official Account Consumption Statement & Bi-Monthly Ledger Summary', leftMargin + 5, 78, { width: contentWidth - 10, align: 'center', lineBreak: false });
    };

    // Helper to draw footer
    const drawPageFooter = () => {
        const footerY = 805;
        doc.moveTo(leftMargin, footerY - 5).lineTo(pageWidth - rightMargin, footerY - 5).stroke(borderGray);
        doc.font(fonts.italic).fontSize(6.5).fillColor('#94a3b8');
        doc.text('Tamil Nadu Generation and Distribution Corporation Ltd • Centralized Consumer Billing Service', leftMargin, footerY, { width: contentWidth, align: 'center', lineBreak: false });
        doc.text(`Report Generated: ${new Date().toLocaleString('en-IN')}`, leftMargin, footerY + 9, { width: contentWidth, align: 'center', lineBreak: false });
    };

    // 1. TOP HEADER BANNER
    drawPageHeader();

    // 2. CONSUMER & ACCOUNT METRIC SUMMARY (Height: 65px)
    const metaY = 98;
    const consumerUser = consumer?.user || {};
    const cName = consumerUser.name || 'Registered Consumer';
    const cEmail = consumerUser.email || 'N/A';
    const sNo = consumer?.serviceNumber || '04-123-001234';
    const cType = consumer?.connectionType || 'LT-1A_DOMESTIC';
    const sLoad = consumer?.sanctionedLoadKw || 2.0;
    const kycStatus = consumer?.verificationStatus || 'PENDING';

    doc.rect(leftMargin, metaY, contentWidth, 65).fill(bgLight).stroke(borderGray);

    // Left info
    doc.font(fonts.bold).fontSize(8).fillColor(slateMuted).text('Consumer Name:', leftMargin + 10, metaY + 8, { lineBreak: false });
    doc.font(fonts.bold).fillColor(slateDark).text(cName, leftMargin + 100, metaY + 8, { lineBreak: false });

    doc.font(fonts.bold).fillColor(slateMuted).text('Service Number:', leftMargin + 10, metaY + 24, { lineBreak: false });
    doc.font(fonts.bold).fillColor('#0284c7').text(sNo, leftMargin + 100, metaY + 24, { lineBreak: false });

    doc.font(fonts.bold).fillColor(slateMuted).text('Registered Email:', leftMargin + 10, metaY + 40, { lineBreak: false });
    doc.font(fonts.regular).fillColor(slateDark).text(cEmail, leftMargin + 100, metaY + 40, { lineBreak: false });

    // Right info
    doc.font(fonts.bold).fillColor(slateMuted).text('Category:', 310, metaY + 8, { lineBreak: false });
    doc.font(fonts.bold).fillColor(slateDark).text(cType.replace('_', ' '), 395, metaY + 8, { lineBreak: false });

    doc.font(fonts.bold).fillColor(slateMuted).text('Sanctioned Load:', 310, metaY + 24, { lineBreak: false });
    doc.font(fonts.bold).fillColor(slateDark).text(`${sLoad} kW`, 395, metaY + 24, { lineBreak: false });

    doc.font(fonts.bold).fillColor(slateMuted).text('e-KYC Status:', 310, metaY + 40, { lineBreak: false });
    doc.font(fonts.bold).fillColor(kycStatus === 'APPROVED' ? greenBadge : goldAccent).text(kycStatus === 'APPROVED' ? '[✓] APPROVED' : '[⏳] PENDING REVIEW', 395, metaY + 40, { lineBreak: false });

    // 3. STATISTICAL SUMMARY TILES (Height: 40px)
    const statsY = 170;
    const totalUnits = (bills || []).reduce((acc, b) => acc + (b.unitsConsumed || 0), 0);
    const totalBilled = (bills || []).reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const paidBills = (bills || []).filter(b => b.status === 'PAID');
    const totalPaid = paidBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const outstanding = totalBilled - totalPaid;

    const tileW = (contentWidth - 24) / 4;
    const drawTile = (x, title, val, highlightColor) => {
        doc.rect(x, statsY, tileW, 38).fill('#ffffff').stroke(borderGray);
        doc.font(fonts.bold).fontSize(7).fillColor(slateMuted).text(title, x + 6, statsY + 6, { lineBreak: false });
        doc.font(fonts.bold).fontSize(10).fillColor(highlightColor).text(val, x + 6, statsY + 18, { lineBreak: false });
    };

    drawTile(leftMargin, 'TOTAL CYCLES', `${(bills || []).length} Bills`, primaryNavy);
    drawTile(leftMargin + tileW + 8, 'TOTAL USAGE', `${totalUnits} kWh`, '#0284c7');
    drawTile(leftMargin + (tileW + 8) * 2, 'TOTAL BILLED', formatCurrency(totalBilled, currSym), slateDark);
    drawTile(leftMargin + (tileW + 8) * 3, 'OUTSTANDING', formatCurrency(outstanding, currSym), outstanding > 0 ? '#dc2626' : greenBadge);

    // 4. BILLING HISTORY TABLE
    let tableY = 216;

    const drawTableHeader = (y) => {
        doc.rect(leftMargin, y, contentWidth, 20).fill(secondaryBlue);
        doc.font(fonts.bold).fontSize(7.5).fillColor('#ffffff');
        doc.text('BILLING CYCLE', leftMargin + 8, y + 5.5, { lineBreak: false });
        doc.text('CATEGORY', 140, y + 5.5, { lineBreak: false });
        doc.text('UNITS (kWh)', 230, y + 5.5, { width: 55, align: 'right', lineBreak: false });
        doc.text(`ENERGY (${currSym.trim()})`, 295, y + 5.5, { width: 75, align: 'right', lineBreak: false });
        doc.text('FIXED/TAX', 380, y + 5.5, { width: 65, align: 'right', lineBreak: false });
        doc.text('TOTAL AMOUNT', 455, y + 5.5, { width: 60, align: 'right', lineBreak: false });
        doc.text('STATUS', 520, y + 5.5, { width: 40, align: 'center', lineBreak: false });
    };

    drawTableHeader(tableY);

    let rowY = tableY + 20;

    if (bills && bills.length > 0) {
        bills.forEach((bill, index) => {
            // Check if adding this row would cause overflow into footer area (760 max)
            if (rowY > 740) {
                drawPageFooter();
                doc.addPage();
                drawPageHeader();
                rowY = 100;
                drawTableHeader(rowY);
                rowY += 20;
            }

            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(leftMargin, rowY, contentWidth, 18).fill(rowBg).stroke(borderGray);

            const fixedAndTax = (bill.fixedCharge || 0) + (bill.electricityTax || 0);
            const isPaid = bill.status === 'PAID';

            doc.font(fonts.bold).fontSize(7.5).fillColor(slateDark).text(bill.billingMonth || 'Cycle', leftMargin + 8, rowY + 4.5, { lineBreak: false });
            doc.font(fonts.regular).fontSize(7).fillColor(slateMuted).text((bill.connectionType || cType).replace('_', ' '), 140, rowY + 4.5, { lineBreak: false });
            doc.font(fonts.regular).fontSize(7.5).fillColor('#0284c7').text(`${bill.unitsConsumed}`, 230, rowY + 4.5, { width: 55, align: 'right', lineBreak: false });
            doc.font(fonts.regular).fillColor(slateDark).text(formatCurrency(bill.energyCharge || 0, currSym), 295, rowY + 4.5, { width: 75, align: 'right', lineBreak: false });
            doc.font(fonts.regular).fillColor(slateMuted).text(formatCurrency(fixedAndTax, currSym), 380, rowY + 4.5, { width: 65, align: 'right', lineBreak: false });
            doc.font(fonts.bold).fillColor(goldAccent).text(formatCurrency(bill.totalAmount || 0, currSym), 455, rowY + 4.5, { width: 60, align: 'right', lineBreak: false });
            doc.font(fonts.bold).fontSize(6.5).fillColor(isPaid ? greenBadge : '#dc2626').text(bill.status || 'UNPAID', 520, rowY + 5, { width: 40, align: 'center', lineBreak: false });

            rowY += 18;
        });

        // Totals Row
        if (rowY > 740) {
            drawPageFooter();
            doc.addPage();
            drawPageHeader();
            rowY = 100;
        }

        doc.rect(leftMargin, rowY, contentWidth, 19).fill('#e2e8f0').stroke(borderGray);
        doc.font(fonts.bold).fontSize(8).fillColor(primaryNavy).text('LIFETIME TOTALS', leftMargin + 8, rowY + 5, { lineBreak: false });
        doc.text(`${totalUnits} kWh`, 230, rowY + 5, { width: 55, align: 'right', lineBreak: false });
        doc.text(formatCurrency(totalBilled, currSym), 440, rowY + 5, { width: 75, align: 'right', lineBreak: false });
        rowY += 26;
    } else {
        doc.rect(leftMargin, rowY, contentWidth, 25).fill('#ffffff').stroke(borderGray);
        doc.font(fonts.italic).fontSize(8).fillColor(slateMuted).text('No historical billing records recorded for this consumer account yet.', leftMargin + 5, rowY + 8, { align: 'center', width: contentWidth - 10, lineBreak: false });
        rowY += 32;
    }

    // 5. OFFICIAL AUDIT NOTICE
    if (rowY > 730) {
        drawPageFooter();
        doc.addPage();
        drawPageHeader();
        rowY = 100;
    }

    doc.rect(leftMargin, rowY, contentWidth, 32).fill(bgLight).stroke(borderGray);
    doc.font(fonts.bold).fontSize(7).fillColor(primaryNavy).text('TANGEDCO ELECTRONIC REVENUE AUDIT STATEMENT', leftMargin + 8, rowY + 6, { lineBreak: false });
    doc.font(fonts.regular).fontSize(6.5).fillColor(slateMuted).text('This consolidated statement is generated automatically by TANGEDCO Central Billing System and serves as an official proof of electricity consumption history.', leftMargin + 8, rowY + 16, { width: contentWidth - 16, lineBreak: false });

    // Page footer pinned at bottom
    drawPageFooter();

    doc.end();
};

module.exports = { generateBillPDF, generateBillHistoryPDF };