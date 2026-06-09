import { DoctorProfile, User } from '../models/index.js';

// Local symptom & specialty rules database
const SYMPTOM_RULES = [
  {
    keywords: ['chest', 'heart', 'tightness', 'palpitation', 'cardio', 'breath'],
    specialty: 'Cardiology',
    advice: 'Your symptoms might be related to cardiovascular health. It is highly recommended to consult a cardiologist.'
  },
  {
    keywords: ['headache', 'migraine', 'dizzy', 'numb', 'paralysis', 'seizure', 'brain'],
    specialty: 'Neurology',
    advice: 'Frequent migraines or neurological discomfort should be evaluated by a neurologist.'
  },
  {
    keywords: ['skin', 'rash', 'itch', 'acne', 'spot', 'mole', 'dermatology'],
    specialty: 'Dermatology',
    advice: 'Skin eruptions, lesions, or chronic itching are best addressed by a dermatologist.'
  },
  {
    keywords: ['bone', 'joint', 'fracture', 'knee', 'back pain', 'muscle', 'sprain', 'ortho'],
    specialty: 'Orthopedics',
    advice: 'Joint pain or bone discomfort typically falls under orthopedic specialization.'
  },
  {
    keywords: ['child', 'pediatric', 'baby', 'kid', 'growth', 'vaccination'],
    specialty: 'Pediatrics',
    advice: 'For infant or child healthcare, our pediatricians provide specialized care.'
  },
  {
    keywords: ['stomach', 'bloat', 'diarrhea', 'acid', 'heartburn', 'digestive', 'gut'],
    specialty: 'Gastroenterology',
    advice: 'Gastrointestinal issues are treated by our gastroenterology department.'
  },
  {
    keywords: ['diabetes', 'sugar', 'thyroid', 'hormone', 'insulin'],
    specialty: 'Endocrinology',
    advice: 'Hormonal conditions and blood sugar management are handled by endocrinologists.'
  }
];

export const processAIChat = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const query = message.toLowerCase();

    // 1. Try to fetch all active doctors to match names or specialties
    const doctors = await DoctorProfile.findAll({
      include: [{ model: User, as: 'user', where: { status: 'active' }, attributes: ['name'] }]
    });

    // 2. Check for direct doctor name match (e.g. "Dr. Sarah Jenkins")
    let matchedDoctor = null;
    for (const doc of doctors) {
      const docName = doc.user.name.toLowerCase();
      const lastName = docName.split(' ').pop(); // e.g. "jenkins"
      if (query.includes(docName) || query.includes(lastName)) {
        matchedDoctor = doc;
        break;
      }
    }

    if (matchedDoctor) {
      return res.status(200).json({
        reply: `I found ${matchedDoctor.user.name} who specializes in ${matchedDoctor.specialization}. Would you like to schedule an appointment?`,
        suggestedAction: 'REDIRECT_BOOK',
        suggestedParams: {
          doctorProfileId: matchedDoctor.id,
          specialization: matchedDoctor.specialization,
          doctorName: matchedDoctor.user.name
        }
      });
    }

    // 3. Check for specialty keyword match (e.g. "book with a cardiologist")
    let matchedSpecialty = null;
    for (const rule of SYMPTOM_RULES) {
      if (query.includes(rule.specialty.toLowerCase())) {
        matchedSpecialty = rule.specialty;
        break;
      }
    }

    if (!matchedSpecialty) {
      // 4. Try matching symptoms from the rules table
      for (const rule of SYMPTOM_RULES) {
        const hasKeyword = rule.keywords.some(kw => query.includes(kw));
        if (hasKeyword) {
          matchedSpecialty = rule.specialty;
          break;
        }
      }
    }

    // If we matched a specialty, find the first available doctor in that specialty
    if (matchedSpecialty) {
      const specialtyDocs = doctors.filter(doc => doc.specialization.toLowerCase() === matchedSpecialty.toLowerCase());
      
      let replyMessage = `Based on your description, I recommend scheduling a consultation with a specialist in ${matchedSpecialty}.`;
      
      if (specialtyDocs.length > 0) {
        const firstDoc = specialtyDocs[0];
        replyMessage += ` You can consult with ${firstDoc.user.name}. Would you like me to open the booking page?`;
        
        return res.status(200).json({
          reply: replyMessage,
          suggestedAction: 'REDIRECT_BOOK',
          suggestedParams: {
            doctorProfileId: firstDoc.id,
            specialization: matchedSpecialty,
            doctorName: firstDoc.user.name
          }
        });
      } else {
        replyMessage += ` Currently, there are no doctors listed under this specialty. Please browse other departments.`;
        return res.status(200).json({ reply: replyMessage });
      }
    }

    // 5. Check if booking intent in general is mentioned
    if (query.includes('book') || query.includes('appointment') || query.includes('schedule') || query.includes('consult')) {
      return res.status(200).json({
        reply: 'Sure! I can help you book an appointment. Please click below to open the directory and choose a specialist, or tell me which doctor or specialization you are looking for.',
        suggestedAction: 'REDIRECT_DIRECTORY'
      });
    }

    // 6. Default response with medical disclaimer
    res.status(200).json({
      reply: "Hello! I am your MediCare AI Assistant. I can help guide you to relevant doctors based on your symptoms or assist in booking appointments. Please describe what you are feeling (e.g., chest tightness, skin rash, headaches) or ask to book with a specific doctor.\n\n*Disclaimer: I am an automated health assistant, not a doctor. If you are experiencing a severe medical emergency, please contact 911 or visit your nearest emergency room immediately.*"
    });
  } catch (error) {
    next(error);
  }
};
