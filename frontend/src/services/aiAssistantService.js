/**
 * Smart TN Electricity AI Knowledge & NLP Voice Assistant Brain
 * Comprehensive bilingual (Tamil & English) domain engine for all electricity,
 * TANGEDCO 2026 tariff rules, renewable energy, and website navigation queries.
 */

const KNOWLEDGE_BASE = [
    // 1. CONNECTION IDENTIFICATION & CLASSIFICATION (DOMESTIC vs COMMERCIAL vs INDUSTRIAL)
    {
        id: 'tariff_classification_identification',
        keywords: [
            'how to know', 'which category', 'classify', 'determine', 'identify connection', 'domestic or commercial', 'industrial or commercial',
            'டொமேஸ்டிக்', 'டொமஸ்டிக்', 'கமர்ஷியல்', 'கமர்சியல்', 'இண்டஸ்ட்ரியல்', 'இண்டஸ்ட்ரி', 'அறிந்து கொள்வது', 'தெரிந்து கொள்வது', 'எவ்வாறு அறிவது',
            'எப்படி தெரிவது', 'எந்த பிரிவு', 'எந்த வகை', 'இணைப்பு வகை', 'வீட்டு இணைப்பா', 'வணிக இணைப்பா', 'தொழில் இணைப்பா'
        ],
        en: "To identify your connection type, check your TANGEDCO service bill or our portal header: 1) LT-1A Domestic: For residences & homes (eligible for 200 free units subsidy). 2) LT-V Commercial: For shops, offices, clinics & commercial spaces (flat ₹9.50/u + ₹110/kW). 3) LT-IIIB Industrial: For factories, mills, and manufacturing plants (₹7.65/u + ₹600/kVA). You can calculate your exact bill by selecting your category in the Bill Calculator page.",
        ta: "உங்கள் மின் இணைப்பு வகையை அறிய TANGEDCO பில் அல்லது எங்கள் போர்ட்டல் சுயவிவரத்தைப் பார்க்கவும்: 1) LT-1A வீட்டு உபயோகம் (Domestic): வீடுகளுக்கானது (200 இலவச யூனிட் மானியம் உண்டு). 2) LT-V வணிக உபயோகம் (Commercial): கடைகள், அலுவலகங்களுக்கானது (யூனிட்டுக்கு ₹9.50 + ₹110/kW). 3) LT-IIIB தொழிற்துறை (Industrial): தொழிற்சாலைகள், பட்டறைகளுக்கானது (யூனிட்டுக்கு ₹7.65 + ₹600/kVA). எங்கள் போர்ட்டலின் 'மின்கட்டணக் கணக்கீட்டாளர்' பக்கத்தில் உங்கள் வகையைத் தேர்ந்தெடுத்து துல்லியமாகக் கணக்கிடலாம்.",
        navigation: '/calculator'
    },

    // 2. HOW TO CALCULATE BILL
    {
        id: 'how_to_calculate_bill',
        keywords: [
            'how to calculate', 'calculate bill', 'calculation method', 'formula',
            'கணக்கிடுவது எப்படி', 'எவ்வாறு கணக்கிடுவது', 'கணக்கிடும் முறை', 'கணக்கிட', 'மின்கட்டணம் கணக்கிடுவது'
        ],
        en: "To calculate your bill: 1) Enter your 60-day units consumed in our Bill Calculator. 2) Select your connection type (LT-1A Domestic, LT-V Commercial, or LT-IIIB Industrial). 3) The calculator applies official TANGEDCO 2026 slab rates, government subsidies, fixed demand charges, and 5% electricity tax automatically.",
        ta: "மின்கட்டணத்தைக் கணக்கிடும் முறை: 1) எங்கள் போர்ட்டலின் 'மின்கட்டணக் கணக்கீட்டாளர்' பக்கத்திற்குச் செல்லவும். 2) உங்கள் இருமாத மின் நுகர்வு யூனிட்களை (kWh) உள்ளிடவும். 3) உங்கள் இணைப்பு வகையைத் (LT-1A வீடு / LT-V வணிகம் / LT-IIIB தொழில்) தேர்ந்தெடுக்கவும். அரசு மானியம், நிலைக்கட்டணம் மற்றும் 5% மின் வரி தானாகக் கணக்கிடப்பட்டு துல்லியமான கட்டணம் காண்பிக்கப்படும்.",
        navigation: '/calculator'
    },

    // 3. BILL QUERY & DUE AMOUNT
    {
        id: 'bill_query',
        keywords: [
            'bill', 'amount', 'cost', 'payment', 'due', 'charge', 'invoice', 'how much',
            'கட்டணம்', 'பில்', 'தொகை', 'எவ்வளவு', 'விலை', 'விலைப்பட்டியல்', 'செலுத்த', 'மின்கட்டணம்'
        ],
        en: "Your current projected bi-monthly bill is calculated based on TANGEDCO 2026 telescopic slab rates. You can view your live breakdown on the Dashboard or calculate custom scenarios in the Bill Calculator.",
        ta: "உங்கள் தற்போதைய இருமாத மின்கட்டணம் TANGEDCO 2026 படிநிலை கட்டண விதிகளின்படி கணக்கிடப்படுகிறது. உங்கள் நேரடி கட்டண விவரங்களை முகப்புப் பலகையிலும் அல்லது மின்கட்டணக் கணக்கீட்டுப் பக்கத்திலும் பார்க்கலாம்.",
        navigation: '/dashboard'
    },

    // 4. LT-1A DOMESTIC TARIFF
    {
        id: 'domestic_tariff',
        keywords: [
            'domestic', 'lt-1a', 'lt1a', 'home tariff', 'slab', 'telescopic', 'household',
            'வீட்டு', 'வீடு', 'எல்டி 1ஏ', 'படிநிலை', 'அடுக்குகள்', 'வீட்டு கட்டணம்', 'டொமஸ்டிக்'
        ],
        en: "LT-1A Domestic Tariff (2026): 0-200 units are FREE (subsidized). 201-400 units are ₹4.50/unit; 401-500 units are ₹6.00/unit. If consumption exceeds 500 units, the free subsidy is forfeited and charged at ₹6.50 to ₹11.00/unit.",
        ta: "LT-1A வீட்டு மின்கட்டணம் (2026): 0-200 யூனிட்கள் முற்றிலும் இலவசம் (அரசு மானியம்). 201-400 யூனிட்களுக்கு ₹4.50/யூனிட்; 401-500 யூனிட்களுக்கு ₹6.00/யூனிட். 500 யூனிட்களைத் தாண்டினால் 200 இலவச யூனிட் மானியம் ரத்தாகி யூனிட்டுக்கு ₹6.50 முதல் ₹11.00 வரை வசூலிக்கப்படும்.",
        navigation: '/tariff'
    },

    // 5. LT-V COMMERCIAL TARIFF
    {
        id: 'commercial_tariff',
        keywords: [
            'commercial', 'lt-v', 'ltv', 'shop', 'business', 'office tariff', 'commercial rate',
            'வணிக', 'வணிகம்', 'எல்டி 5', 'கடை', 'அலுவலகம்', 'வணிகக் கட்டணம்', 'கமர்சியல்', 'கமர்ஷியல்'
        ],
        en: "LT-V Commercial Tariff (2026): Non-telescopic flat rate of ₹9.50/kWh plus fixed demand charge of ₹110/kW/month and 5% electricity duty tax.",
        ta: "LT-V வணிக மின்கட்டணம் (2026): ஒற்றை அடுக்கு அடிப்படையில் யூனிட்டுக்கு ₹9.50/kWh, மாதத்திற்கு ₹110/kW நிலைக்கட்டணம் மற்றும் 5% மின் வரி விதிக்கப்படுகிறது.",
        navigation: '/tariff'
    },

    // 6. LT-IIIB INDUSTRIAL TARIFF
    {
        id: 'industrial_tariff',
        keywords: [
            'industrial', 'lt-iiib', 'factory', 'workshop', 'industry', 'power factor', 'industrial rate',
            'தொழிற்துறை', 'தொழில்', 'தொழிற்சாலை', 'எல்டி 3பி', 'பவர் பேக்டர்', 'இண்டஸ்ட்ரியல்', 'இண்டஸ்ட்ரி'
        ],
        en: "LT-IIIB Industrial Tariff (2026): Flat rate of ₹7.65/kWh with ₹600/kVA monthly sanctioned demand charge. Requires maintaining a minimum power factor of 0.90 to avoid low power factor penalty.",
        ta: "LT-IIIB தொழிற்துறை கட்டணம் (2026): யூனிட்டுக்கு ₹7.65/kWh மற்றும் மாதத்திற்கு ₹600/kVA அனுமதிக்கப்பட்ட நிலைக்கட்டணம். பவர் பேக்டர் 0.90க்கு குறையாமல் பராமரிப்பது அபராதத்தைத் தவிர்க்க அவசியமாகும்.",
        navigation: '/tariff'
    },

    // 7. SUBSIDY CLIFF & 200 FREE UNITS
    {
        id: 'subsidy_cliff',
        keywords: [
            'subsidy', 'free units', '200 units', '500 units', 'cliff', 'cutoff', 'forfeit',
            'மானியம்', 'இலவச யூனிட்', '200 யூனிட்', '500 யூனிட்', 'இலவசம்', 'மானிய இழப்பு', 'சப்சிடி'
        ],
        en: "Under Tamil Nadu Government rules, domestic consumers get 200 units free per bi-monthly cycle if total consumption stays under 500 kWh. Crossing 500 kWh triggers the subsidy cliff where all 200 free units are lost.",
        ta: "தமிழக அரசு விதிகளின்படி, வீட்டு நுகர்வோரின் இருமாத நுகர்வு 500 kWh-க்குள் இருக்கும்போது 200 யூனிட்கள் இலவசமாக வழங்கப்படுகிறது. 500 kWh-ஐத் தாண்டினால் 200 இலவச யூனிட் மானியம் முழுமையாக ரத்தாகிவிடும்.",
        navigation: '/insights'
    },

    // 8. SOLAR & PM SURYA GHAR
    {
        id: 'solar_renewables',
        keywords: [
            'solar', 'sun', 'pm surya', 'surya ghar', 'rooftop', 'green energy', 'subsidy solar', 'net meter',
            'சூரிய ஒளி', 'சூரிய சக்தி', 'பிஎம் சூர்யா', 'சூர்யா கர்', 'மேற்கூரை சூரிய மின்', 'பசுமை ஆற்றல்', 'நிகர அளவீடு', 'சோலார்'
        ],
        en: "PM Surya Ghar Muft Bijli Yojana provides up to ₹78,000 subsidy for 3kW rooftop solar systems (₹30,000 for 1kW, ₹60,000 for 2kW). Bi-directional net-meters export surplus daytime solar energy back to the TANGEDCO grid.",
        ta: "பி.எம் சூர்யா கர் திட்டத்தின் கீழ் 3kW மேற்கூரை சூரிய மின் திட்டத்திற்கு ₹78,000 வரை மத்திய அரசு மானியம் வழங்கப்படுகிறது (1kW-க்கு ₹30,000, 2kW-க்கு ₹60,000). இருவழி நிகர அளவீட்டு மீட்டர் (Net-meter) மூலம் கூடுதல் மின்சாரத்தை அரசு மின் கட்டமைப்புக்கு அனுப்பலாம்.",
        navigation: '/renewables'
    },

    // 9. LIVE IOT METER & TELEMETRY
    {
        id: 'iot_telemetry',
        keywords: [
            'meter', 'iot', 'telemetry', 'live', 'voltage', 'current', 'amps', 'frequency', 'power', 'real-time',
            'மீட்டர்', 'ஐஓடி', 'நேரலை', 'மின்னழுத்தம்', 'மின்னோட்டம்', 'அதிர்வெண்', 'வாட்ஸ்', 'நிகழ்நேர', 'வோல்டேஜ்'
        ],
        en: "The Live IoT Meter streams real-time bi-directional telemetry: Line Voltage (nominal 230V ±6%), Load Current (Amps), Active Power (kW), Grid Frequency (50 Hz), and Power Factor.",
        ta: "நேரலை ஐஓடி ஸ்மார்ட் மீட்டர் நிகழ்நேர மின்னழுத்தம் (230V), மின்னோட்டம் (Amps), மின்திறன் (kW), அதிர்வெண் (50 Hz) மற்றும் பவர் பேக்டர் தரவுகளை உடனுக்குடன் கண்காணிக்கிறது.",
        navigation: '/iot'
    },

    // 10. ENERGY SAVING & APPLIANCES
    {
        id: 'energy_saving_tips',
        keywords: [
            'save', 'saving', 'tips', 'reduce', 'lower bill', 'ac', 'inverter', 'refrigerator', 'geyser', 'bldc',
            'சேமிப்பு', 'சேமிப்பது எப்படி', 'குறைக்க', 'ஏசி', 'பிரிட்ஜ்', 'ஹீட்டர்', 'மின் சேமிப்பு', 'டிப்ஸ்'
        ],
        en: "Key Energy Saving Tips: 1) Keep inverter AC at 24°C (saves ~24% power). 2) Switch to 28W BLDC ceiling fans (saves 60%). 3) Limit water geyser to 15 mins. 4) Use LED lighting (saves 80% vs incandescent).",
        ta: "முக்கிய மின்சேமிப்பு ஆலோசனைகள்: 1) இன்வெர்ட்டர் ஏசியை 24°C-ல் இயக்கவும் (24% வரை மின் சேமிப்பு). 2) 28W BLDC ஃபேன்களைப் பயன்படுத்தவும் (60% வரை சேமிப்பு). 3) வாட்டர் ஹீட்டரை 15 நிமிடங்களுக்கு மேல் இயக்க வேண்டாம். 4) எல்.இ.டி பல்புகளைப் பயன்படுத்தவும்.",
        navigation: '/insights'
    },

    // 11. BILL HISTORY & TAX INVOICE
    {
        id: 'history_invoice',
        keywords: [
            'history', 'receipt', 'download', 'tax invoice', 'past bills', 'statement', 'pdf', 'build history', 'bill history', 'download history', 'download pdf',
            'வரலாறு', 'ரசீது', 'பதிவிறக்கம்', 'வரி விலைப்பட்டியல்', 'முந்தைய பில்', 'அறிக்கை', 'பிடிஎப்', 'பில் வரலாறு'
        ],
        en: "In the Billing History page, you can view all archived bi-monthly electricity bills, download official TANGEDCO PDF tax invoices with digital SHA-256 signatures, and get consolidated annual statements.",
        ta: "மின்கட்டண வரலாற்றுப் பக்கத்தில் உங்கள் முந்தைய அனைத்து பில்களையும் பார்க்கலாம், SHA-256 டிஜிட்டல் கையொப்பமிட்ட அதிகாரப்பூர்வ TANGEDCO வரி விலைப்பட்டியல்களை PDF வடிவில் பதிவிறக்கம் செய்யலாம்.",
        navigation: '/history'
    },

    // 12. KYC & VERIFICATION
    {
        id: 'kyc_verification',
        keywords: [
            'kyc', 'document', 'verify', 'verification', 'aadhaar', 'property tax', 'upload', 'approved', 'rejected',
            'கேஒய்சி', 'ஆவணம்', 'சரிபார்ப்பு', 'ஆதார்', 'சொத்து வரி', 'பதிவேற்றம்', 'அங்கீகாரம்'
        ],
        en: "Consumer verification requires uploading valid proof: Aadhaar Card for Domestic LT-1A, Property Tax Receipt or Trade License for Commercial/Industrial connections. Admin reviews and approves KYC in the Verification Hub.",
        ta: "நுகர்வோர் சரிபார்ப்புக்கு வீட்டு இணைப்புக்கு ஆதார் அட்டையும், வணிக/தொழிற்துறைக்கு சொத்து வரி ரசீது அல்லது வணிக உரிமத்தையும் பதிவேற்ற வேண்டும். நிர்வாகி இதனை சரிபார்த்து அங்கீகரிப்பார்.",
        navigation: '/dashboard'
    },

    // 13. HELPLINE & GRIEVANCE (1912 / MINNAGAM)
    {
        id: 'helpline_grievance',
        keywords: [
            'complaint', 'helpline', 'contact', 'customer care', 'emergency', 'power cut', 'outage', 'minnagam', '1912',
            'புகார்', 'உதவி எண்', 'தொடர்பு', 'மின்வெட்டு', 'மின்னகம்', 'அவசரம்'
        ],
        en: "TANGEDCO 24x7 Minnagam Centralized Consumer Grievance Toll-Free Helpline is 1912 or +91 94987 94987 for outage reports, emergency fuse-off calls, and billing complaints.",
        ta: "TANGEDCO 24x7 மின்னகம் நுகர்வோர் சேவை மற்றும் அவசர உதவி எண்: 1912 அல்லது +91 94987 94987. மின்வெட்டு, மீட்டர் கோளாறு மற்றும் புகார்களுக்கு எந்நேரமும் தொடர்பு கொள்ளலாம்."
    }
];

/**
 * Clean & Stem words for better Tamil and English matching
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Intelligent Multi-Pattern NLP Matching Function
 */
export function queryAiKnowledge(userInput, language = 'en') {
    if (!userInput || typeof userInput !== 'string') {
        return {
            text: language === 'ta'
                ? "வணக்கம்! மின்கட்டணக் கணக்கீடு, LT-1A வீட்டு / LT-V வணிக / LT-IIIB தொழில் வகைப்பாடு, 200 இலவச யூனிட் மானியம், சோலார் திட்டம் அல்லது நேரலை மீட்டர் பற்றி எதையும் கேட்கலாம்."
                : "Hello! You can ask anything about calculating your bill, identifying connection tariffs (Domestic/Commercial/Industrial), subsidies, solar rooftop, or live IoT meter.",
            navigation: null
        };
    }

    const cleanInput = normalizeText(userInput);

    // 1. SPECIFIC MULTI-INTENT: Check if user asks about classifying / identifying Domestic vs Commercial vs Industrial
    const hasClassification = (
        cleanInput.includes('டொமேஸ்டிக்') || cleanInput.includes('டொமஸ்டிக்') ||
        cleanInput.includes('கமர்ஷியல்') || cleanInput.includes('கமர்சியல்') ||
        cleanInput.includes('இண்டஸ்ட்ரியல்') || cleanInput.includes('இண்டஸ்ட்ரி') ||
        cleanInput.includes('domestic') || cleanInput.includes('commercial') || cleanInput.includes('industrial')
    );
    const hasHowToKnowOrCalculate = (
        cleanInput.includes('எவ்வாறு') || cleanInput.includes('எப்படி') ||
        cleanInput.includes('அறிந்து') || cleanInput.includes('தெரிந்து') ||
        cleanInput.includes('கணக்கிடு') || cleanInput.includes('கட்டணம்') ||
        cleanInput.includes('how') || cleanInput.includes('know') || cleanInput.includes('calculate') || cleanInput.includes('find')
    );

    if (hasClassification && hasHowToKnowOrCalculate) {
        const match = KNOWLEDGE_BASE.find(k => k.id === 'tariff_classification_identification');
        if (match) {
            return {
                text: language === 'ta' ? match.ta : match.en,
                navigation: match.navigation,
                id: match.id
            };
        }
    }

    // 2. Score each knowledge topic based on keyword occurrences
    let bestMatch = null;
    let highestScore = 0;

    for (const item of KNOWLEDGE_BASE) {
        let score = 0;
        for (const kw of item.keywords) {
            const cleanKw = normalizeText(kw);
            if (cleanInput.includes(cleanKw)) {
                score += cleanKw.length > 5 ? 4 : 2;
            }
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }

    // High confidence match
    if (bestMatch && highestScore >= 2) {
        return {
            text: language === 'ta' ? bestMatch.ta : bestMatch.en,
            navigation: bestMatch.navigation || null,
            id: bestMatch.id
        };
    }

    // 3. Conversational Queries
    if (
        cleanInput.includes('hello') || cleanInput.includes('hi') || cleanInput.includes('hey') ||
        cleanInput.includes('வணக்கம்') || cleanInput.includes('ஹலோ')
    ) {
        return {
            text: language === 'ta'
                ? "வணக்கம்! நான் மின்னி, உங்கள் ஸ்மார்ட் தமிழ்நாடு ஏஐ மின்சார உதவியாளர். மின்கட்டணம், கட்டண அடுக்குகள் (வீட்டு/வணிக/தொழில்), 200 இலவச யூனிட் மானியம் அல்லது நேரலை மீட்டர் பற்றி என்ன உதவி வேண்டும்?"
                : "Hello! I am Minni, your Smart TN Electricity Voice Assistant. How can I help you with your bill, tariffs, solar rooftop, or live smart meter today?",
            navigation: null
        };
    }

    // 4. Default comprehensive electricity response
    return {
        text: language === 'ta'
            ? `உங்கள் கேள்வி: "${userInput}". உங்கள் மின்கட்டணத்தைக் கணக்கிட போர்ட்டலில் 'மின்கட்டணக் கணக்கீட்டாளர்' பக்கத்தைப் பயன்படுத்தலாம். LT-1A (வீடு), LT-V (வணிகம்), LT-IIIB (தொழிற்துறை) கட்டண விதிகள், 200 இலவச யூனிட் மானியம் மற்றும் சோலார் திட்ட விவரங்களை அறிய என்னை எந்நேரமும் கேட்கலாம்.`
            : `Regarding "${userInput}": You can calculate your bill anytime using our Bill Calculator. Ask me about LT-1A Domestic, LT-V Commercial, or LT-IIIB Industrial tariffs, 200 free units subsidy, or PM Surya Ghar solar.`,
        navigation: '/calculator'
    };
}
