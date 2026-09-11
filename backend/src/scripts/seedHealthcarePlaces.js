// Seeds the `healthcare_places` collection with sample data for demo/testing.
// Run: npm run seed   (from backend/)
import 'dotenv/config';
import mongoose from 'mongoose';
import { HealthcarePlace } from '../models/HealthcarePlace.js';

const PLACES = [
  // Hyderabad
  { name: 'Apollo Hospitals Jubilee Hills', type: 'hospital', city: 'Hyderabad', address: 'Road No. 72, Jubilee Hills, Hyderabad', phone: '04023607777', openStatus: 'Open' },
  { name: 'Yashoda Hospitals Somajiguda', type: 'hospital', city: 'Hyderabad', address: 'Raj Bhavan Road, Somajiguda, Hyderabad', phone: '04045674567', openStatus: 'Open' },
  { name: 'KIMS Hospital Secunderabad', type: 'hospital', city: 'Hyderabad', address: 'Minister Road, Secunderabad, Hyderabad', phone: '04044885000', openStatus: 'Open' },
  { name: 'MedPlus Pharmacy Madhapur', type: 'pharmacy', city: 'Hyderabad', address: 'Ayyappa Society, Madhapur, Hyderabad', phone: '04066661234', openStatus: 'Open' },
  { name: 'Apollo Pharmacy Banjara Hills', type: 'pharmacy', city: 'Hyderabad', address: 'Road No. 1, Banjara Hills, Hyderabad', phone: '04023335566', openStatus: 'Open' },
  { name: 'NetMeds Store Gachibowli', type: 'pharmacy', city: 'Hyderabad', address: 'DLF Cyber City, Gachibowli, Hyderabad', phone: '04066778899', openStatus: 'Closed' },

  // Ghatkesar, Hyderabad
  { name: 'Neelima Hospitals (NIMS Teaching Hospital)', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+918181057057', openStatus: 'Open' },
  { name: 'Alroyce MultiSpeciality Hospital', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+919849623890', openStatus: 'Open' },
  { name: 'Amrutha Sai Hospital', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+919700666876', openStatus: 'Open' },
  { name: 'Siri Multi Speciality Hospital', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+917670806600', openStatus: 'Open' },
  { name: 'Shraddha Hospital', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+919989513630', openStatus: 'Open' },
  { name: 'Sri Kalki Multi Speciality Hospital', type: 'hospital', city: 'Hyderabad', address: 'Ghatkesar, Hyderabad', phone: '+919290786888', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Main Road)', type: 'pharmacy', city: 'Hyderabad', address: '7/168/9, Ghatkesar Rd, Ghatkesar, Hyderabad', phone: '+918374453203', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Edulabad Road)', type: 'pharmacy', city: 'Hyderabad', address: 'Edulabad Road, Ghatkesar, Hyderabad', phone: '+919247524676', openStatus: 'Open' },
  { name: 'MedPlus (Ghatkesar Main Road)', type: 'pharmacy', city: 'Hyderabad', address: 'D No.7-168/9, Block No.7, Ram Nagar, Ghatkesar, Hyderabad', phone: '+919392145805', openStatus: 'Open' },

  // Uppal, Hyderabad
  { name: 'TX Hospitals Uppal', type: 'hospital', city: 'Hyderabad', address: 'Uppal, Hyderabad', phone: '+919144514459', openStatus: 'Open' },
  { name: "Spark Hospitals (Peerzadiguda)", type: 'hospital', city: 'Hyderabad', address: 'Peerzadiguda, Uppal, Hyderabad', phone: '+914027206777', openStatus: 'Open' },
  { name: 'Sumithra Hospital', type: 'hospital', city: 'Hyderabad', address: 'Uppal, Hyderabad', phone: '+917729999760', openStatus: 'Open' },
  { name: 'Sri Balaji Nursing Home', type: 'hospital', city: 'Hyderabad', address: 'Uppal, Hyderabad', phone: '+919848021627', openStatus: 'Open' },
  { name: 'Aditya Hospital (Uppal Wing)', type: 'hospital', city: 'Hyderabad', address: 'Uppal, Hyderabad', phone: '+919441238677', openStatus: 'Open' },
  { name: 'SMR Hospitals and Palliative Care', type: 'hospital', city: 'Hyderabad', address: 'Uppal, Hyderabad', phone: '+919948894030', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Vijayapuri Colony)', type: 'pharmacy', city: 'Hyderabad', address: 'Vijayapuri Colony, Uppal, Hyderabad', phone: '+917942812345', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Prashanth Nagar)', type: 'pharmacy', city: 'Hyderabad', address: 'Prashanth Nagar, Uppal, Hyderabad', phone: '+917947479353', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Beerappagadda)', type: 'pharmacy', city: 'Hyderabad', address: 'Beerappagadda, Uppal, Hyderabad', phone: '+917947479895', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Boduppal Main Road)', type: 'pharmacy', city: 'Hyderabad', address: 'Boduppal Main Road, Uppal, Hyderabad', phone: '+917942813647', openStatus: 'Open' },

  // LB Nagar, Hyderabad
  { name: 'Kamineni Hospitals', type: 'hospital', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+917036270362', openStatus: 'Open' },
  { name: "Rainbow Children's Hospital", type: 'hospital', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+918037836513', openStatus: 'Open' },
  { name: 'Ankura Hospital for Women & Children', type: 'hospital', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+919053108108', openStatus: 'Open' },
  { name: 'Ozone Hospitals (Kothapet)', type: 'hospital', city: 'Hyderabad', address: 'Kothapet, LB Nagar, Hyderabad', phone: '+919533388108', openStatus: 'Open' },
  { name: 'Paramitha Children Hospital', type: 'hospital', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+914045206379', openStatus: 'Open' },
  { name: 'Laalityam Hospitals', type: 'hospital', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+919063666108', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Chintalkunta Checkpost)', type: 'pharmacy', city: 'Hyderabad', address: 'Chintalkunta Checkpost, LB Nagar, Hyderabad', phone: '+919154846880', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Opp. Kamineni Hospital)', type: 'pharmacy', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+917947479500', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (NTR Nagar)', type: 'pharmacy', city: 'Hyderabad', address: 'NTR Nagar, LB Nagar, Hyderabad', phone: '+917207912039', openStatus: 'Open' },
  { name: 'MedPlus (Near Metro Station)', type: 'pharmacy', city: 'Hyderabad', address: 'LB Nagar, Hyderabad', phone: '+916303926262', openStatus: 'Open' },

  // Secunderabad, Hyderabad
  { name: 'Medicover Hospitals', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+914068334455', openStatus: 'Open' },
  { name: 'Kasturi Hospital & IVF Centre', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+917207375534', openStatus: 'Open' },
  { name: 'Smile N Glow Dental & Skin Hospital', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+917330796890', openStatus: 'Open' },
  { name: 'Manasa Nursing Home', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+919704064640', openStatus: 'Open' },
  { name: 'Sai Jyothi Eye Hospital', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+914027701686', openStatus: 'Open' },
  { name: 'Ferty 9 Fertility Centre', type: 'hospital', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+918977738917', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Apollo Hospital Secunderabad Wing)', type: 'pharmacy', city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '+919154218366', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Begumpet / SP Road)', type: 'pharmacy', city: 'Hyderabad', address: 'Begumpet, Secunderabad, Hyderabad', phone: '+917947480041', openStatus: 'Open' },
  { name: 'Apollo Pharmacy (Picket / Karkhana)', type: 'pharmacy', city: 'Hyderabad', address: 'Picket, Secunderabad, Hyderabad', phone: '+917942813317', openStatus: 'Open' },
  { name: 'MedPlus (Cherlapalli / Kapra Circle)', type: 'pharmacy', city: 'Hyderabad', address: 'Cherlapalli, Secunderabad, Hyderabad', phone: '+916300531129', openStatus: 'Open' },

  // Bengaluru
  { name: 'Manipal Hospital Old Airport Road', type: 'hospital', city: 'Bengaluru', address: 'Old Airport Road, Bengaluru', phone: '08025023200', openStatus: 'Open' },
  { name: 'Fortis Hospital Bannerghatta', type: 'hospital', city: 'Bengaluru', address: 'Bannerghatta Road, Bengaluru', phone: '08066214444', openStatus: 'Open' },
  { name: 'MedPlus Pharmacy Koramangala', type: 'pharmacy', city: 'Bengaluru', address: '5th Block, Koramangala, Bengaluru', phone: '08041234567', openStatus: 'Open' },
  { name: 'Apollo Pharmacy Indiranagar', type: 'pharmacy', city: 'Bengaluru', address: '100 Feet Road, Indiranagar, Bengaluru', phone: '08025213456', openStatus: 'Open' },

  // Mumbai
  { name: 'Lilavati Hospital Bandra', type: 'hospital', city: 'Mumbai', address: 'Bandra Reclamation, Bandra West, Mumbai', phone: '02226751000', openStatus: 'Open' },
  { name: 'Kokilaben Dhirubhai Ambani Hospital', type: 'hospital', city: 'Mumbai', address: 'Four Bungalows, Andheri West, Mumbai', phone: '02230999999', openStatus: 'Open' },
  { name: 'Wellness Forever Pharmacy Andheri', type: 'pharmacy', city: 'Mumbai', address: 'Veera Desai Road, Andheri West, Mumbai', phone: '02226334455', openStatus: 'Open' },
  { name: 'MedPlus Pharmacy Dadar', type: 'pharmacy', city: 'Mumbai', address: 'Ranade Road, Dadar West, Mumbai', phone: '02224458899', openStatus: 'Closed' },

  // Delhi
  { name: 'AIIMS New Delhi', type: 'hospital', city: 'Delhi', address: 'Ansari Nagar, New Delhi', phone: '01126588500', openStatus: 'Open' },
  { name: 'Max Super Speciality Hospital Saket', type: 'hospital', city: 'Delhi', address: 'Press Enclave Road, Saket, New Delhi', phone: '01126515050', openStatus: 'Open' },
  { name: 'Apollo Pharmacy Connaught Place', type: 'pharmacy', city: 'Delhi', address: 'Connaught Place, New Delhi', phone: '01123412345', openStatus: 'Open' },
  { name: 'MedPlus Pharmacy Karol Bagh', type: 'pharmacy', city: 'Delhi', address: 'Ajmal Khan Road, Karol Bagh, New Delhi', phone: '01128765432', openStatus: 'Open' },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DATABASE || 'arogyaai',
  });

  await HealthcarePlace.deleteMany({});
  await HealthcarePlace.insertMany(PLACES);

  console.log(`Seeded ${PLACES.length} healthcare places.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
